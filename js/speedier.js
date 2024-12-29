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
                    stacked: true,
                },
                y: {
                    stacked: true
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
