// Initialize variables
let ghgData;
let myChart;

// Get data from project activities

fetch('data.json') 
  .then(response => response.json())
  .then(data => {
    // Process the fetched data here
    ghgData = data;
    // Set canvas context
    const ctx = document.getElementById('myChart').getContext('2d');

    // Create the chart with all datasets initially
    myChart = new Chart(ctx, {
      type: 'bar',
      data: {
          labels: ghgData.labels,
          datasets: ghgData.datasets
      },
      options: {
          scales: {
              x: {
                  stacked: true
              },
              y: {
                  stacked: true,
                  title: {
                      display: true,
                      text: "GHG Emissions Avoided (tonnes of CO2e)"
                  }, // Add a comma here
              }
          },
          plugins: {
              legend: {
                  onClick: (event, legendItem, legend) => {
                      const index = legendItem.datasetIndex;
                      const ci = legend.chart;
                      ci.data.datasets[index].hidden = !ci.data.datasets[index].hidden;
                      ci.update();
                  },
                  onHover: (event, legendItem, legend) => {
                      legend.chart.canvas.style.cursor = 'pointer';
                  },
                  onLeave: (event, legendItem, legend) => {
                      legend.chart.canvas.style.cursor = 'default';
                  },
                  labels: {
                    usePointStyle: true,
                    pointStyle: 'circle'
                  }
              }
          },
          maintainAspectRatio: false
      }
    });
  })
  .catch(error => {
    console.error('Error fetching data:', error);
  });

/* The following code works with the HTML checkboxes to control chart rendering

// Get all checkboxes
const checkboxes = document.querySelectorAll('input[type="checkbox"]');

// Attach event listeners to all checkboxes
checkboxes.forEach(checkbox => {
  checkbox.addEventListener('change', updateChartVisibility);
});

// Function to update chart visibility based on checkbox
function updateChartVisibility() { 
  myChart.data.datasets.forEach((dataset, index) => {
    dataset.hidden = !checkboxes[index].checked;
  });
  myChart.update();
}

*/
const monthSelect = document.getElementById('monthSelect');
monthSelect.addEventListener('change', () => {
    const selectedMonth = monthSelect.value;
    const monthlyTotals = calculateMonthlyTotals(ghgData, selectedMonth);
    console.log(monthlyTotals);
    // Update your chart with the new monthlyTotals 
    myChart.data = monthlyTotals; 
    myChart.update(); 
});

const dateFilterSelect = document.getElementById('dateFilter');
dateFilterSelect.addEventListener('change', (event) => {
  let timeScale = event.target.value;
  dateFilter(timeScale);
});

function calculateMonthlyTotals(data, month) {
  const monthlyTotals = {
    "datasets": []
  };
  // Only sum up the data for the selected month
  data.datasets.forEach(dataset => {
    let sum = 0;
    dataset.data.forEach(point => {
      if (point.x.substring(5, 7) === month) { 
        sum += point.y; 
      }
    });
    // Build out the new JSON object for the chart
    monthlyTotals.datasets.push({
      "label": dataset.label,
      "data": [{ "x": month, "y": sum }], 
      "backgroundColor": dataset.backgroundColor 
    });
  });
  return monthlyTotals;
}

function dateFilter(timeScale) {
  myChart.config.options.scales.x.time.unit = timeScale;
  myChart.update;
}