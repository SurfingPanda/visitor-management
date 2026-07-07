<?php

use App\Http\Controllers\BiometricDeviceController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DeliveryLogController;
use App\Http\Controllers\DriverController;
use App\Http\Controllers\EmergencyRosterController;
use App\Http\Controllers\EquipmentController;
use App\Http\Controllers\HelperController;
use App\Http\Controllers\IncidentReportController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ScrapDisposalController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\SupplierDeliveryController;
use App\Http\Controllers\TripController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VehicleController;
use App\Http\Controllers\VisitorController;
use App\Http\Controllers\VisitorRequestController;
use Illuminate\Support\Facades\Route;

// Secora is an internal tool with no public landing page — send the bare
// domain straight into the app (dashboard when logged in, login otherwise).
Route::get('/', function () {
    return redirect()->route(auth()->check() ? 'dashboard' : 'login');
});

// Public, unauthenticated visitor self-registration. Throttled to curb spam
// submissions and brute-force lookups of the random reference.
Route::get('/visit', [VisitorRequestController::class, 'create'])->name('visit.create');
Route::post('/visit', [VisitorRequestController::class, 'store'])
    ->middleware('throttle:6,1')
    ->name('visit.store');
Route::get('/visit/status', [VisitorRequestController::class, 'status'])
    ->middleware('throttle:30,1')
    ->name('visit.status');
// Signature images, scoped to the visitor's own (secret) reference.
Route::get('/visit/status/{reference}/signature/{which}', [VisitorRequestController::class, 'publicSignature'])
    ->whereIn('which', ['visitor', 'approver'])
    ->middleware('throttle:60,1')
    ->name('visit.signature');

Route::get('/dashboard', [DashboardController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::middleware(['auth', 'verified', 'module.access'])->group(function () {
    Route::get('/visitors', [VisitorController::class, 'index'])->name('visitors.index');
    Route::get('/badges', [VisitorController::class, 'badges'])->name('badges.index');

    // Staff review queue for public /visit submissions (Front Desk module).
    Route::get('/visitor-requests', [VisitorRequestController::class, 'index'])->name('visitor-requests.index');
    Route::get('/visitor-requests/{visitorRequest}/signature/{which}', [VisitorRequestController::class, 'signature'])
        ->whereIn('which', ['visitor', 'approver'])
        ->name('visitor-requests.signature');
    Route::post('/visitor-requests/{visitorRequest}/approve', [VisitorRequestController::class, 'approve'])->name('visitor-requests.approve');
    Route::patch('/visitor-requests/{visitorRequest}/decline', [VisitorRequestController::class, 'decline'])->name('visitor-requests.decline');
    Route::delete('/visitor-requests/{visitorRequest}', [VisitorRequestController::class, 'destroy'])->name('visitor-requests.destroy');
    Route::post('/visitors', [VisitorController::class, 'store'])->name('visitors.store');
    Route::get('/visitors/scan', [VisitorController::class, 'scan'])->name('visitors.scan');
    Route::post('/visitors/scan', [VisitorController::class, 'scanCheckout'])->name('visitors.scan-checkout');
    Route::get('/visitors/export', [VisitorController::class, 'export'])->name('visitors.export');
    Route::get('/visitors/{visitor}/badge', [VisitorController::class, 'badge'])->name('visitors.badge');
    Route::get('/visitors/{visitor}/photo/{which}', [VisitorController::class, 'photo'])
        ->whereIn('which', ['face', 'id'])
        ->name('visitors.photo');
    Route::get('/visitors/{visitor}', [VisitorController::class, 'show'])->name('visitors.show');
    Route::patch('/visitors/{visitor}', [VisitorController::class, 'update'])->name('visitors.update');
    Route::patch('/visitors/{visitor}/check-in', [VisitorController::class, 'checkIn'])->name('visitors.check-in');
    Route::patch('/visitors/{visitor}/check-out', [VisitorController::class, 'checkOut'])->name('visitors.check-out');

    Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');
    Route::get('/reports/export', [ReportController::class, 'export'])->name('reports.export');

    Route::get('/incident-reports', [IncidentReportController::class, 'index'])->name('incident-reports.index');
    Route::get('/incident-reports/template', [IncidentReportController::class, 'template'])->name('incident-reports.template');
    Route::post('/incident-reports', [IncidentReportController::class, 'store'])->name('incident-reports.store');
    Route::patch('/incident-reports/{incidentReport}', [IncidentReportController::class, 'update'])->name('incident-reports.update');

    Route::get('/emergency-roster', [EmergencyRosterController::class, 'index'])->name('emergency-roster.index');

    Route::get('/delivery-logs', [DeliveryLogController::class, 'index'])->name('delivery-logs.index');
    Route::get('/delivery-logs/export', [DeliveryLogController::class, 'export'])->name('delivery-logs.export');
    Route::get('/delivery-logs/print', [DeliveryLogController::class, 'printable'])->name('delivery-logs.print');
    Route::post('/delivery-logs', [DeliveryLogController::class, 'store'])->name('delivery-logs.store');
    Route::patch('/delivery-logs/{deliveryLog}/return', [DeliveryLogController::class, 'markReturned'])->name('delivery-logs.return');
    Route::patch('/delivery-logs/{deliveryLog}', [DeliveryLogController::class, 'update'])->name('delivery-logs.update');
    Route::delete('/delivery-logs/{deliveryLog}', [DeliveryLogController::class, 'destroy'])->name('delivery-logs.destroy');

    Route::get('/vehicles', [VehicleController::class, 'index'])->name('vehicles.index');
    Route::post('/vehicles', [VehicleController::class, 'store'])->name('vehicles.store');
    Route::get('/vehicles/{vehicle}', [VehicleController::class, 'show'])->name('vehicles.show');
    Route::patch('/vehicles/{vehicle}', [VehicleController::class, 'update'])->name('vehicles.update');
    Route::delete('/vehicles/{vehicle}', [VehicleController::class, 'destroy'])->name('vehicles.destroy');

    Route::post('/vehicles/{vehicle}/trips', [TripController::class, 'store'])->name('trips.store');
    Route::patch('/trips/{trip}', [TripController::class, 'update'])->name('trips.update');
    Route::delete('/trips/{trip}', [TripController::class, 'destroy'])->name('trips.destroy');

    Route::get('/drivers', [DriverController::class, 'index'])->name('drivers.index');
    Route::get('/drivers/{driver}', [DriverController::class, 'show'])->name('drivers.show');
    Route::post('/drivers', [DriverController::class, 'store'])->name('drivers.store');
    Route::patch('/drivers/{driver}', [DriverController::class, 'update'])->name('drivers.update');
    Route::delete('/drivers/{driver}', [DriverController::class, 'destroy'])->name('drivers.destroy');

    Route::get('/helpers', [HelperController::class, 'index'])->name('helpers.index');
    Route::get('/helpers/{helper}', [HelperController::class, 'show'])->name('helpers.show');
    Route::post('/helpers', [HelperController::class, 'store'])->name('helpers.store');
    Route::patch('/helpers/{helper}', [HelperController::class, 'update'])->name('helpers.update');
    Route::delete('/helpers/{helper}', [HelperController::class, 'destroy'])->name('helpers.destroy');

    Route::get('/equipment', [EquipmentController::class, 'index'])->name('equipment.index');
    Route::post('/equipment', [EquipmentController::class, 'store'])->name('equipment.store');
    Route::patch('/equipment/{equipment}', [EquipmentController::class, 'update'])->name('equipment.update');
    Route::delete('/equipment/{equipment}', [EquipmentController::class, 'destroy'])->name('equipment.destroy');

    Route::get('/scrap-disposals', [ScrapDisposalController::class, 'index'])->name('scrap-disposals.index');
    Route::post('/scrap-disposals', [ScrapDisposalController::class, 'store'])->name('scrap-disposals.store');
    Route::patch('/scrap-disposals/{scrapDisposal}', [ScrapDisposalController::class, 'update'])->name('scrap-disposals.update');
    Route::delete('/scrap-disposals/{scrapDisposal}', [ScrapDisposalController::class, 'destroy'])->name('scrap-disposals.destroy');

    Route::get('/supplier-deliveries', [SupplierDeliveryController::class, 'index'])->name('supplier-deliveries.index');
    Route::get('/supplier-deliveries/export', [SupplierDeliveryController::class, 'export'])->name('supplier-deliveries.export');
    Route::get('/supplier-deliveries/print', [SupplierDeliveryController::class, 'printable'])->name('supplier-deliveries.print');
    Route::post('/supplier-deliveries', [SupplierDeliveryController::class, 'store'])->name('supplier-deliveries.store');
    Route::patch('/supplier-deliveries/{supplierDelivery}', [SupplierDeliveryController::class, 'update'])->name('supplier-deliveries.update');
    Route::patch('/supplier-deliveries/{supplierDelivery}/check-out', [SupplierDeliveryController::class, 'checkOut'])->name('supplier-deliveries.check-out');
    Route::delete('/supplier-deliveries/{supplierDelivery}', [SupplierDeliveryController::class, 'destroy'])->name('supplier-deliveries.destroy');
});

// Admin-only team / user management.
Route::middleware(['auth', 'verified', 'admin'])->group(function () {
    // Manual retention clean-up for visitor requests (destructive → admin-only).
    Route::post('/visitor-requests/prune', [VisitorRequestController::class, 'prune'])->name('visitor-requests.prune');

    Route::get('/users', [UserController::class, 'index'])->name('users.index');
    Route::post('/users', [UserController::class, 'store'])->name('users.store');
    Route::patch('/users/{user}', [UserController::class, 'update'])->name('users.update');
    Route::delete('/users/{user}', [UserController::class, 'destroy'])->name('users.destroy');

    Route::post('/biometric-devices', [BiometricDeviceController::class, 'store'])->name('biometric-devices.store');
    Route::get('/biometric-devices/{biometricDevice}/test', [BiometricDeviceController::class, 'test'])->name('biometric-devices.test');
    Route::get('/biometric-devices/{biometricDevice}/sync', [BiometricDeviceController::class, 'sync'])->name('biometric-devices.sync');
    Route::patch('/biometric-devices/{biometricDevice}', [BiometricDeviceController::class, 'update'])->name('biometric-devices.update');
    Route::delete('/biometric-devices/{biometricDevice}', [BiometricDeviceController::class, 'destroy'])->name('biometric-devices.destroy');
});

Route::middleware('auth')->group(function () {
    Route::get('/settings', [SettingsController::class, 'edit'])->name('settings.index');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
