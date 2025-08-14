import { useEffect, useRef } from 'react';

function Sparkline({ data, color = '#8B5CF6' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const ctx = ref.current.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map((_, i) => i),
        datasets: [{
          data,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          borderColor: color
        }]
      },
      options: {
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
        responsive: true,
        maintainAspectRatio: false
      }
    });
    return () => chart.destroy();
  }, [data, color]);

  return <div className="h-12"><canvas ref={ref}></canvas></div>;
}

export default Sparkline;