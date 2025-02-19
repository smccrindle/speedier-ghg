/* TODO

Generate JSON files with hourly data for each month
- Name files in the format YYYY-MM.json
- powers month and day views

Generate JSON files with monthly data for each year
- Name files in the format YYYY.json
- powers year and total views

*/

// Initialize variables
let ghgData;
let myChart;
let currentView = "total";
let currentYear = 2024;
let currentMonth = 1;
let currentDay = 5;

// Collect interface control elements
const prev = document.getElementById('prev');
const prevNextLabel = document.getElementById('prevNextLabel');
const next = document.getElementById('next');

const day = document.getElementById('day');
const month = document.getElementById('month');
const year = document.getElementById('year');
const total = document.getElementById('total');

// Event listeners for day/month/year/total interface controls
day.addEventListener('click', () => {
  // We may need a leading zero for the month and/or day
  let monthOfYear = String(currentMonth).padStart(2, '0');
  let dayOfMonth = String(currentDay).padStart(2, '0');
  prevNextLabel.textContent = `${currentYear}-${monthOfYear}-${dayOfMonth}`;
  showDay(dayOfMonth);
});

month.addEventListener('click', () => {
  // We may need a leading zero for the month
  let monthOfYear = String(currentMonth).padStart(2, '0');
  prevNextLabel.textContent = `${currentYear}-${monthOfYear}`;
  showMonth(monthOfYear);
});

// Event listeners for prev and next buttons
prev.addEventListener("click", updatePrev);
next.addEventListener("click", updateNext);

// Get data from project activities
fetch('2024-01.json') 
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
                  }
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


// Function to show a single day, hour-by-hour
function showDay(dayOfMonth) {
  const dailyData = [];

  ghgData.datasets.forEach(dataset => {
      const datasetDailyData = [];
      const data = []; // Initialize data array

      for (let i = 0; i < 24; i++) { // Iterate through all 24 hours
          const hour = String(i).padStart(2, '0');
          const expectedTime = `${ghgData.datasets[0].data[0].x.slice(0, 8)}${String(dayOfMonth).padStart(2, '0')} ${hour}:00:00`; // Construct the expected time string


          const dataPoint = dataset.data.find(item => item.x === expectedTime);
          data.push(dataPoint ? dataPoint.y : 0); // Use data or 0 if missing
      }

      dataset.data.forEach(item => {
          const itemDay = parseInt(item.x.slice(8, 10));

          if (itemDay === dayOfMonth) {
              datasetDailyData.push(item);
          }
      });

      dailyData.push({
          label: dataset.label,
          data: data, // Use the correctly aligned data array
          backgroundColor: dataset.backgroundColor
      });
  });

  myChart.data.labels = Array.from({ length: 24 }, (_, i) => {
      const hour = String(i).padStart(2, '0');
      return `${ghgData.datasets[0].data[0].x.slice(0, 8)}${String(dayOfMonth).padStart(2, '0')} ${hour}:00:00`; //Hourly labels
  });
  myChart.data.datasets = dailyData;
  currentView = "day";
  myChart.update();
};


// Function to show a single month, day-by-day
function showMonth(monthOfYear) {
  const dailyData = []; // Will hold aggregated data for all datasets
  const allDailyTotals = {}; // Object to store daily totals for each dataset

  ghgData.datasets.forEach(dataset => {
      const dailyTotals = {}; // Daily totals for THIS dataset
      dataset.data.forEach(item => {
          const date = item.x.slice(0, 10);
          if (!dailyTotals[date]) {
              dailyTotals[date] = 0;
          }
          dailyTotals[date] += item.y;
      });

      // Store the daily totals for this dataset, keyed by dataset label
      allDailyTotals[dataset.label] = dailyTotals;
  });

  // Create the chart data structure
  myChart.data.labels = Object.keys(allDailyTotals[ghgData.datasets[0].label]); // Use the dates from the first dataset as labels
  myChart.data.datasets = ghgData.datasets.map(dataset => {
      const datasetDailyTotals = allDailyTotals[dataset.label];
      const data = Object.keys(datasetDailyTotals).map(date => datasetDailyTotals[date]);
      return {
          label: dataset.label,
          data: data,
          backgroundColor: dataset.backgroundColor // Preserve original colors
      };
  });
  currentView = 'month';
  myChart.update();
}

// Function to update the prev/next buttons

function updatePrev() {
  // Re-enable the next and prev buttons in case they were disabled
  prev.disabled = false;
  next.disabled = false;
  switch (currentView) {
    case "total":
      // The prev and next buttons are not needed
      prev.disabled = true;
      break;
    case "year":
      // Update event listeners for the prev and next buttons
      break;
    case "month":
      // Update event listeners for the prev and next buttons
      break;
    case "day":
      // We need to know the number of days in the current month
      let numDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      currentDay--;
      // if we are at the first day of the month, disable the prev button
      if (currentDay <= 1) {
        prev.disabled = true;
        currentDay = 1;
      };
      // We may need a leading zero for the month and/or day
      let monthOfYear = String(currentMonth).padStart(2, '0');
      let dayOfMonth = String(currentDay).padStart(2, '0');
      prevNextLabel.textContent = `${currentYear}-${monthOfYear}-${dayOfMonth}`;
      showDay(currentDay);
      break;
    default:
      console.log("Invalid currentView");
      break;
  };
};

function updateNext() {
  // Re-enable the next and prev buttons in case they were disabled
  prev.disabled = false;
  next.disabled = false;
  switch (currentView) {
    case "total":
      // The prev and next buttons are not needed
      next.disabled = true;
      break;
    case "year":
      // Update event listeners for the prev and next buttons
      break;
    case "month":
      // Update event listeners for the prev and next buttons
      break;
    case "day":
      // We need to know the number of days in the current month
      let numDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      currentDay++;
      // if we are at the last day of the month, disable the next button
      if (currentDay >= numDaysInMonth) {
        next.disabled = true;
        currentDay = numDaysInMonth;
      };
      // We may need a leading zero for the month and/or day
      let monthOfYear = String(currentMonth).padStart(2, '0');
      let dayOfMonth = String(currentDay).padStart(2, '0');
      prevNextLabel.textContent = `${currentYear}-${monthOfYear}-${dayOfMonth}`;
      showDay(currentDay);
      break;
    default:
      console.log("Invalid currentView");
      break;
  };
};

