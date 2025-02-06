// Initialize variables
let ghgData;
let myChart;

// Register the date adapter
// myChart.register(ChartDateFns); // This line is crucial!

/* ---------- Start of datepicker attempt ----------*/
const datePicker = document.getElementById('datePicker'); // Use datePicker ID
const monthSelect = document.getElementById('monthSelect'); // Add a select for the month
const yearSelect = document.getElementById('yearSelect'); // Add a select for the year

// Populate month select
const months = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
months.forEach((month, index) => {
const option = document.createElement('option');
option.value = String(index + 1).padStart(2, '0'); // 01, 02, ..., 12
option.text = month;
monthSelect.appendChild(option);
});

// Populate year select (you might want to make this dynamic based on your data)
const currentYear = new Date().getFullYear();
for (let i = currentYear - 5; i <= currentYear + 5; i++) { // Example: 5 years back and 5 years forward
const option = document.createElement('option');
option.value = i;
option.text = i;
yearSelect.appendChild(option);
}

// Date picker event listener
datePicker.addEventListener('change', () => {
  const selectedDate = datePicker.value;
  filterByDate(selectedDate);
});
// Event listener for month and year changes
monthSelect.addEventListener('change', filterByMonth);
yearSelect.addEventListener('change', filterByMonth);

// Filter by date
function filterByDate(date) {
  const filteredData = {
    datasets: []
  };

  ghgData.datasets.forEach(dataset => {
    const filteredDatasetData = dataset.data.filter(point => point.x.startsWith(date));
    filteredData.datasets.push({
      label: dataset.label,
      data: filteredDatasetData,
      backgroundColor: dataset.backgroundColor
    });
  });

  myChart.data = filteredData;
  myChart.options.scales.x.title = {
    display: true,
    text: `Emissions for ${date}`
  };
  myChart.update();
}

// Filter by month
function filterByMonth() {
  const selectedMonth = monthSelect.value;
  const selectedYear = yearSelect.value;

  const filteredData = {
    datasets: []
  };

  ghgData.datasets.forEach(dataset => {
    const filteredDatasetData = dataset.data.filter(point => {
      const pointDate = new Date(point.x);
      const pointMonth = String(pointDate.getMonth() + 1).padStart(2, '0');
      const pointYear = pointDate.getFullYear();
      return pointMonth === selectedMonth && pointYear === parseInt(selectedYear);
    });

    // Group data by day of the month
    const dailyData = {};
    filteredDatasetData.forEach(point => {
      const day = point.x.slice(8, 10); // Extract day (01, 02, ..., 31)
      if (!dailyData[day]) {
        dailyData[day] = [];
      }
      dailyData[day].push(point);
    });

    const aggregatedDailyData = Object.keys(dailyData).map(day => {
      let sum = 0;
      dailyData[day].forEach(point => {
        sum += point.y;
      });
      return { x: `${selectedYear}-${selectedMonth}-${day}`, y: sum }; // Keep ISO 8601 format!!!
    });

    filteredData.datasets.push({
        label: dataset.label,
        data: aggregatedDailyData,
        backgroundColor: dataset.backgroundColor
      });
  });

  myChart.data = filteredData;
  myChart.options.scales.x.title = {
    display: true,
    text: `Emissions for ${months[parseInt(selectedMonth) - 1]}, ${selectedYear} (Daily)`
  };
  myChart.options.scales.x.type = 'time';
  myChart.options.scales.x.time = {
      unit: 'day',
      displayFormats: { // Format the date display
        day: 'MMM DD' // Example: "Jan 20", "Feb 15", etc.
      }
  };
  myChart.update();
}

/* ---------- End of datepicker attempt ----------*/

// Get data from project activities
fetch('data-hourly.json') 
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

    /* ---------- Start of datepicker attempt ----------*/
    const dates = new Set();
    data.datasets.forEach(dataset => {
      dataset.data.forEach(point => {
        dates.add(point.x.slice(0, 10));
      });
    });

    // Set the initial date of the date picker (optional but recommended)
    if (dates.size > 0) {
      const firstDate = Array.from(dates)[0];
      datePicker.value = firstDate; // Set the initial value of the date picker
      filterByDate(firstDate); // Filter and display the chart for the first date
    }

    // Set initial month/year selection (optional)
    const firstPointDate = new Date(ghgData.datasets[0].data[0].x); // Get the first date
    monthSelect.value = String(firstPointDate.getMonth() + 1).padStart(2, '0');
    yearSelect.value = firstPointDate.getFullYear();
    filterByMonth(); // Initial filter

    /* ---------- End of datepicker attempt ----------*/


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
// const monthSelect = document.getElementById('monthSelect');
// monthSelect.addEventListener('change', () => {
//     const selectedMonth = monthSelect.value;
//     const monthlyTotals = calculateMonthlyTotals(ghgData, selectedMonth);
//     console.log(monthlyTotals);
//     // Update your chart with the new monthlyTotals 
//     myChart.data = monthlyTotals; 
//     myChart.update(); 
// });

// const dateFilterSelect = document.getElementById('dateFilter');
// dateFilterSelect.addEventListener('change', (event) => {
//   let timeScale = event.target.value;
//   dateFilter(timeScale);
// });

// function calculateMonthlyTotals(data, month) {
//   const monthlyTotals = {
//     "datasets": []
//   };
//   // Only sum up the data for the selected month
//   data.datasets.forEach(dataset => {
//     let sum = 0;
//     dataset.data.forEach(point => {
//       if (point.x.substring(5, 7) === month) { 
//         sum += point.y; 
//       }
//     });
//     // Build out the new JSON object for the chart
//     monthlyTotals.datasets.push({
//       "label": dataset.label,
//       "data": [{ "x": month, "y": sum }], 
//       "backgroundColor": dataset.backgroundColor 
//     });
//   });
//   return monthlyTotals;
// }

// function dateFilter(timeScale) {
//   myChart.config.options.scales.x.time.unit = timeScale;
//   myChart.update;
// }