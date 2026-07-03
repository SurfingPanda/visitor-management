import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
);

/* ---------- palette (validated data-viz reference, light surface) ---------- */

const SERIES_BLUE = '#2a78d6';

// Categorical hues in fixed order — never cycled, never rank-based.
const CATEGORICAL = [
    '#2a78d6', // blue
    '#1baf7a', // aqua
    '#eda100', // yellow
    '#008300', // green
    '#4a3aa7', // violet
    '#e34948', // red
    '#e87ba4', // magenta
    '#eb6834', // orange
];

// Reserved status palette — ships with a text label, never color alone.
const SEVERITY_COLORS = {
    low: '#0ca30c', // good
    medium: '#fab219', // warning
    high: '#ec835a', // serious
    critical: '#d03b3b', // critical
};

const INK_SECONDARY = '#52514e';
const INK_MUTED = '#898781';
const GRID = '#e1e0d9';

const FONT_FAMILY =
    'system-ui, -apple-system, "Segoe UI", sans-serif';

/* Draws the count at the end of each horizontal bar (selective direct label). */
const barValuePlugin = {
    id: 'barValue',
    afterDatasetsDraw(chart) {
        const { ctx } = chart;
        const meta = chart.getDatasetMeta(0);
        ctx.save();
        ctx.font = `600 12px ${FONT_FAMILY}`;
        ctx.fillStyle = INK_SECONDARY;
        ctx.textBaseline = 'middle';
        meta.data.forEach((bar, i) => {
            const value = chart.data.datasets[0].data[i];
            ctx.textAlign = 'left';
            ctx.fillText(value, bar.x + 8, bar.y);
        });
        ctx.restore();
    },
};

const emptyState = (message) => (
    <p className="py-6 text-sm text-gray-400">{message}</p>
);

/* ---------- horizontal bar (ranked categorical, single hue) ---------- */

export function RankedBar({ items, empty }) {
    if (!items || items.length === 0) return emptyState(empty);

    const data = {
        labels: items.map((i) => i.label),
        datasets: [
            {
                data: items.map((i) => i.count),
                backgroundColor: SERIES_BLUE,
                borderRadius: 4,
                borderSkipped: false,
                barThickness: 18,
                maxBarThickness: 22,
            },
        ],
    };

    const max = Math.max(1, ...items.map((i) => i.count));

    const options = {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { right: 28 } },
        plugins: {
            legend: { display: false },
            tooltip: {
                displayColors: false,
                backgroundColor: '#0b0b0b',
                padding: 10,
                callbacks: {
                    label: (ctx) => ` ${ctx.parsed.x}`,
                },
            },
        },
        scales: {
            x: {
                beginAtZero: true,
                suggestedMax: max * 1.1,
                grid: { color: GRID, drawTicks: false },
                border: { display: false },
                ticks: {
                    precision: 0,
                    color: INK_MUTED,
                    font: { family: FONT_FAMILY, size: 11 },
                },
            },
            y: {
                grid: { display: false },
                border: { display: false },
                ticks: {
                    color: INK_SECONDARY,
                    font: { family: FONT_FAMILY, size: 12 },
                },
            },
        },
    };

    const height = Math.max(120, items.length * 40 + 24);

    return (
        <div style={{ height }}>
            <Bar data={data} options={options} plugins={[barValuePlugin]} />
        </div>
    );
}

/* ---------- doughnut (part-to-whole composition) ---------- */

function DoughnutChart({ items, empty, colors }) {
    if (!items || items.length === 0) return emptyState(empty);

    const data = {
        labels: items.map((i) => i.label),
        datasets: [
            {
                data: items.map((i) => i.count),
                backgroundColor: colors,
                borderColor: '#ffffff',
                borderWidth: 2, // 2px surface gap between segments
                hoverOffset: 4,
            },
        ],
    };

    const total = items.reduce((sum, i) => sum + i.count, 0);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    color: INK_SECONDARY,
                    font: { family: FONT_FAMILY, size: 12 },
                    boxWidth: 12,
                    boxHeight: 12,
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 12,
                },
            },
            tooltip: {
                backgroundColor: '#0b0b0b',
                padding: 10,
                callbacks: {
                    label: (ctx) => {
                        const pct = total
                            ? Math.round((ctx.parsed / total) * 100)
                            : 0;
                        return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
                    },
                },
            },
        },
    };

    return (
        <div style={{ height: 220 }}>
            <Doughnut data={data} options={options} />
        </div>
    );
}

/* By category — categorical hues in fixed order. */
export function CategoryDoughnut({ items, empty }) {
    const colors = (items || []).map(
        (_, i) => CATEGORICAL[i % CATEGORICAL.length],
    );
    return <DoughnutChart items={items} empty={empty} colors={colors} />;
}

/* By severity — reserved status palette, matched by severity level. */
export function SeverityDoughnut({ items, empty }) {
    const colors = (items || []).map((i) => {
        const key = String(i.label || '').toLowerCase();
        return SEVERITY_COLORS[key] || INK_MUTED;
    });
    return <DoughnutChart items={items} empty={empty} colors={colors} />;
}

/* ---------- time-series magnitude (line + gradient area) ---------- */

export function AreaTrend({ daily, unit = 'visit', color = SERIES_BLUE }) {
    const rgb = hexToRgb(color);

    const data = {
        labels: daily.map((d) => d.label),
        datasets: [
            {
                data: daily.map((d) => d.count),
                borderColor: color,
                borderWidth: 2,
                fill: true,
                tension: 0.35,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: color,
                pointHoverBorderColor: '#ffffff',
                pointHoverBorderWidth: 2,
                // Scriptable gradient: computed once the chart area exists.
                backgroundColor: (ctx) => {
                    const { chart } = ctx;
                    const { ctx: c, chartArea } = chart;
                    if (!chartArea) return `rgba(${rgb},0.12)`;
                    const g = c.createLinearGradient(
                        0,
                        chartArea.top,
                        0,
                        chartArea.bottom,
                    );
                    g.addColorStop(0, `rgba(${rgb},0.30)`);
                    g.addColorStop(1, `rgba(${rgb},0.02)`);
                    return g;
                },
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { display: false },
            tooltip: {
                displayColors: false,
                backgroundColor: '#0b0b0b',
                padding: 10,
                callbacks: {
                    title: (ctx) => ctx[0].label,
                    label: (ctx) =>
                        ` ${ctx.parsed.y} ${unit}${ctx.parsed.y === 1 ? '' : 's'}`,
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                border: { color: GRID },
                ticks: {
                    color: INK_MUTED,
                    font: { family: FONT_FAMILY, size: 10 },
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 12,
                },
            },
            y: {
                beginAtZero: true,
                grid: { color: GRID, drawTicks: false },
                border: { display: false },
                ticks: {
                    precision: 0,
                    color: INK_MUTED,
                    font: { family: FONT_FAMILY, size: 11 },
                    maxTicksLimit: 5,
                },
            },
        },
    };

    return (
        <div style={{ height: 224 }}>
            <Line data={data} options={options} />
        </div>
    );
}

function hexToRgb(hex) {
    const m = hex.replace('#', '');
    const n = parseInt(
        m.length === 3
            ? m
                  .split('')
                  .map((c) => c + c)
                  .join('')
            : m,
        16,
    );
    return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

/* ---------- daily visits (time-series magnitude) ---------- */

export function DailyBar({ daily }) {
    const data = {
        labels: daily.map((d) => d.label),
        datasets: [
            {
                data: daily.map((d) => d.count),
                backgroundColor: SERIES_BLUE,
                borderRadius: 4,
                borderSkipped: false,
                maxBarThickness: 28,
                categoryPercentage: 0.85,
                barPercentage: 0.9,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                displayColors: false,
                backgroundColor: '#0b0b0b',
                padding: 10,
                callbacks: {
                    title: (ctx) => ctx[0].label,
                    label: (ctx) =>
                        ` ${ctx.parsed.y} visit${ctx.parsed.y === 1 ? '' : 's'}`,
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                border: { color: GRID },
                ticks: {
                    color: INK_MUTED,
                    font: { family: FONT_FAMILY, size: 10 },
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 12,
                },
            },
            y: {
                beginAtZero: true,
                grid: { color: GRID, drawTicks: false },
                border: { display: false },
                ticks: {
                    precision: 0,
                    color: INK_MUTED,
                    font: { family: FONT_FAMILY, size: 11 },
                    maxTicksLimit: 5,
                },
            },
        },
    };

    return (
        <div style={{ height: 224 }}>
            <Bar data={data} options={options} />
        </div>
    );
}
