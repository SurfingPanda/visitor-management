<?php

namespace App\Http\Controllers;

use App\Models\IncidentReport;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\Shared\Converter;
use PhpOffice\PhpWord\SimpleType\Jc;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Inertia\Inertia;
use Inertia\Response;

class IncidentReportController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = [
            'search' => $request->string('search')->toString(),
            'type' => $request->string('type')->toString(),
            'status' => $request->string('status')->toString(),
        ];

        $reports = IncidentReport::query()
            ->when($filters['search'], function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                        ->orWhere('location', 'like', "%{$search}%")
                        ->orWhere('people_involved', 'like', "%{$search}%")
                        ->orWhere('reporter_name', 'like', "%{$search}%");
                });
            })
            ->when(
                in_array($filters['type'], ['incident', 'accident'], true),
                fn ($query) => $query->where('type', $filters['type'])
            )
            ->when(
                in_array($filters['status'], ['open', 'under_review', 'resolved'], true),
                fn ($query) => $query->where('status', $filters['status'])
            )
            ->latest('occurred_at')
            ->latest('id')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('IncidentReports/Index', [
            'reports' => $reports,
            'filters' => $filters,
            'counts' => [
                'all' => IncidentReport::count(),
                'open' => IncidentReport::where('status', 'open')->count(),
                'under_review' => IncidentReport::where('status', 'under_review')->count(),
                'resolved' => IncidentReport::where('status', 'resolved')->count(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'in:incident,accident'],
            'title' => ['required', 'string', 'max:255'],
            'severity' => ['required', 'in:low,medium,high,critical'],
            'location' => ['nullable', 'string', 'max:255'],
            'people_involved' => ['nullable', 'string', 'max:255'],
            'witness' => ['nullable', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'reported_by' => ['nullable', 'string', 'max:255'],
            'occurred_at' => ['nullable', 'date'],
            'categories' => ['nullable', 'array'],
            'categories.*' => ['string', 'in:injury_first_aid,injury_medical,property_damage,equipment_failure,code_violation'],
        ]);

        // "Reported by" is free text; fall back to the logged-in user's name.
        $reporterName = $validated['reported_by'] ?? null;
        unset($validated['reported_by']);

        IncidentReport::create([
            ...$validated,
            'status' => 'open',
            'reported_by' => $request->user()->id,
            'reporter_name' => $reporterName ?: $request->user()->name,
        ]);

        return redirect()
            ->route('incident-reports.index')
            ->with('success', 'Report filed.');
    }

    /**
     * Download a blank Incident / Accident report as a .docx template.
     *
     * Mirrors the official printed form (Control No. BW-HRD-SF-11) rendered in
     * IncidentReports/Index.jsx so a filled-in Word copy matches the print view.
     */
    public function template(Request $request): BinaryFileResponse
    {
        $phpWord = new PhpWord();
        $phpWord->setDefaultFontName('Arial');
        $phpWord->setDefaultFontSize(10);

        $section = $phpWord->addSection([
            'marginTop' => Converter::cmToTwip(1.4),
            'marginBottom' => Converter::cmToTwip(1.4),
            'marginLeft' => Converter::cmToTwip(1.4),
            'marginRight' => Converter::cmToTwip(1.4),
        ]);

        // --- Header: logo (best-effort) + company block ---------------------
        [$logoPng, $logoIsTemp] = $this->logoAsPng();

        $header = $section->addTable();
        $header->addRow();
        $logoCell = $header->addCell(Converter::cmToTwip(6));
        if ($logoPng) {
            [$w, $h] = getimagesize($logoPng);
            $targetH = 52;
            $logoCell->addImage($logoPng, [
                'height' => $targetH,
                'width' => (int) round(($w / max($h, 1)) * $targetH),
            ]);
        }

        $right = ['alignment' => Jc::END];
        $companyCell = $header->addCell(Converter::cmToTwip(12));
        $companyCell->addText('ELJIN CORPORATION', ['bold' => true, 'size' => 13], $right);
        $companyCell->addText('Sta. Rosa Road Zone 2', [], $right);
        $companyCell->addText('Brgy Maliwalo, City of Tarlac 2300', [], $right);
        $companyCell->addText('(+63) 045-982-3481', ['bold' => true], $right);

        $section->addTextBreak(1);
        $section->addText(
            'INCIDENT / ACCIDENT REPORT',
            ['bold' => true, 'size' => 18],
            ['alignment' => Jc::CENTER, 'spaceAfter' => 240]
        );

        // --- Classification checkboxes (two columns) ------------------------
        $box = "\u{2610}  "; // ballot box + spacing
        $checks = $section->addTable(['cellMargin' => 40]);
        $checks->addRow();
        $left = $checks->addCell(Converter::cmToTwip(9));
        foreach ([
            'Injury – First Aid Treatment',
            'Injury - Medical / Emergency Treatment',
            'Property Damage',
        ] as $label) {
            $left->addText($box . $label, [], ['spaceAfter' => 120]);
        }
        $rightCol = $checks->addCell(Converter::cmToTwip(9));
        foreach ([
            'Equipment Failure / Break Down',
            'Violation of code of conduct and ethics with Company Rules and Regulation',
        ] as $label) {
            $rightCol->addText($box . $label, [], ['spaceAfter' => 120]);
        }

        $section->addTextBreak(1);

        // --- Main form table ------------------------------------------------
        $c1 = Converter::cmToTwip(5.5);
        $c2 = Converter::cmToTwip(4.0);
        $c3 = Converter::cmToTwip(4.7);
        $c4 = Converter::cmToTwip(4.0);
        $span2 = $c1 + $c2;

        $table = $section->addTable([
            'borderSize' => 10,
            'borderColor' => '000000',
            'cellMargin' => 80,
            'layout' => \PhpOffice\PhpWord\Style\Table::LAYOUT_FIXED,
            'width' => $c1 + $c2 + $c3 + $c4,
            'unit' => 'dxa',
        ]);

        $lbl = ['bold' => true];
        $top = ['valign' => 'top'];
        $span2Top = ['gridSpan' => 2, 'valign' => 'top'];

        // Row 1: Name label | Date Filed
        $table->addRow(Converter::cmToTwip(0.7));
        $table->addCell($span2, $span2Top)
            ->addText('Name of Employee Involved in the Incident:', $lbl);
        $table->addCell($c3, $top)->addText('Date Filed:', $lbl);
        $table->addCell($c4, $top)->addText('');

        // Row 2: Name answer space | Reported By
        $table->addRow(Converter::cmToTwip(0.9));
        $table->addCell($span2, $span2Top)->addText('');
        $table->addCell($c3, $top)->addText('Reported By:', $lbl);
        $table->addCell($c4, $top)->addText('');

        // Row 3: Date & time | Location
        $table->addRow(Converter::cmToTwip(1.0));
        $table->addCell($c1, $top)->addText('Date and time of Incident:', $lbl);
        $table->addCell($c2, $top)->addText('');
        $table->addCell($c3, $top)->addText('Site/Location of Incident:', $lbl);
        $table->addCell($c4, $top)->addText('');

        // Row 4: Details (large blank area)
        $table->addRow(Converter::cmToTwip(6.5));
        $table->addCell($c1 + $c2 + $c3 + $c4, ['gridSpan' => 4, 'valign' => 'top'])
            ->addText('Details of the Incident', $lbl);

        // Row 5: Other persons | Witness
        $table->addRow(Converter::cmToTwip(1.4));
        $table->addCell($span2, $span2Top)->addText('Other Persons Involved:', $lbl);
        $table->addCell($c3 + $c4, ['gridSpan' => 2, 'valign' => 'top'])
            ->addText('Witness to the Incident:', $lbl);

        // Row 6: Received / HR | CC
        $table->addRow(Converter::cmToTwip(1.3));
        $recv = $table->addCell($span2, ['gridSpan' => 2, 'valign' => 'top']);
        $recv->addText('Received By/Date:', $lbl);
        $recv->addText('HR Department:', $lbl);
        $cc = $table->addCell($c3 + $c4, ['gridSpan' => 2, 'valign' => 'top']);
        $cc->addText('CC: Department Head', $lbl);
        $cc->addText("\t201 File", $lbl);

        $section->addText(
            'Control No. BW-HRD-SF-11',
            ['italic' => true, 'size' => 9],
            ['alignment' => Jc::END, 'spaceBefore' => 120]
        );

        // --- Stream as a download ------------------------------------------
        $tmp = tempnam(sys_get_temp_dir(), 'ir_tpl');
        IOFactory::createWriter($phpWord, 'Word2007')->save($tmp);
        if ($logoPng && $logoIsTemp) {
            @unlink($logoPng);
        }

        return response()
            ->download($tmp, 'Incident_Accident_Report_Template.docx', [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ])
            ->deleteFileAfterSend(true);
    }

    /**
     * Path to a PNG logo PhpWord can embed. Prefers the committed PNG; if only
     * the webp exists it is converted via GD when available. Returns [path,
     * $isTemp] — $isTemp files are cleaned up after the document is written.
     * A null path means no logo could be resolved (a text header is used).
     */
    private function logoAsPng(): array
    {
        $png = public_path('logo_main.png');
        if (is_file($png)) {
            return [$png, false];
        }

        // Fallback: convert the webp on the fly when GD supports it.
        $webp = public_path('logo_main.webp');
        if (is_file($webp) && function_exists('imagecreatefromwebp')) {
            try {
                $img = @imagecreatefromwebp($webp);
                if ($img) {
                    $tmp = tempnam(sys_get_temp_dir(), 'logo') . '.png';
                    imagepng($img, $tmp);
                    imagedestroy($img);

                    return [$tmp, true];
                }
            } catch (\Throwable $e) {
                // fall through to no logo
            }
        }

        return [null, false];
    }

    public function update(Request $request, IncidentReport $incidentReport): RedirectResponse
    {
        // Supports both the status-only quick change and a full edit. Every field
        // uses "sometimes" so a partial payload (e.g. just status) still validates.
        $validated = $request->validate([
            'type' => ['sometimes', 'required', 'in:incident,accident'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'severity' => ['sometimes', 'required', 'in:low,medium,high,critical'],
            'location' => ['sometimes', 'nullable', 'string', 'max:255'],
            'people_involved' => ['sometimes', 'nullable', 'string', 'max:255'],
            'witness' => ['sometimes', 'nullable', 'string', 'max:255'],
            'description' => ['sometimes', 'required', 'string'],
            'reported_by' => ['sometimes', 'nullable', 'string', 'max:255'],
            'occurred_at' => ['sometimes', 'nullable', 'date'],
            'categories' => ['sometimes', 'nullable', 'array'],
            'categories.*' => ['string', 'in:injury_first_aid,injury_medical,property_damage,equipment_failure,code_violation'],
            'status' => ['sometimes', 'required', 'in:open,under_review,resolved'],
        ]);

        // A resolved report is locked for full edits; only a status change
        // (e.g. reopening it) is allowed while it stays resolved.
        $statusOnly = array_keys($validated) === ['status'];
        if (! $statusOnly && $incidentReport->status === 'resolved') {
            return back()->with(
                'error',
                'Resolved reports are locked. Reopen the report to edit it.'
            );
        }

        // "Reported by" is free text; keep the existing name when left blank.
        if (array_key_exists('reported_by', $validated)) {
            $name = $validated['reported_by'];
            unset($validated['reported_by']);
            $validated['reporter_name'] = $name ?: $incidentReport->reporter_name;
        }

        $incidentReport->update($validated);

        return back()->with(
            'success',
            $statusOnly ? 'Report status updated.' : 'Report updated.'
        );
    }
}
