// Initialize variables
let ghgData;
let myChart;

// Get data from project activities

fetch('data.json') 
  .then(response => response.json())
  .then(data => {
    // Process the fetched data here
    console.log(data);
    ghgData = data;
    // Set canvas context
    const ctx = document.getElementById('myChart').getContext('2d');

    // Set each dataset to visible by default
    data.datasets.forEach(dataset => {
      dataset.hidden = false; // Initialize hidden property to false
    });

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
