/* TODO

Generate JSON files with hourly data for each month
- Name files in the format YYYY-MM.json
- powers month and day views

Generate JSON files with monthly data for each year
- Name files in the format YYYY.json
- powers year and total views

Generate JSON file for all time
- Powers total view
*/

/* CONSTANTS AND VARIABLES
---------------------------------------------------------------------------------------------------- */

// Initialize variables
let jsonFileName = "2024-01.json";
let ghgData;
let myChart;
let currentView = "month";
let currentYear = 2024;
let currentMonth = 1;
let currentDay = 1; // Always start with day 1 when we initialize the dashboard

// Collect interface control elements
const prevBtn = document.getElementById('prev');
const prevNextLabel = document.getElementById('prevNextLabel');
const nextBtn = document.getElementById('next');

const diagnostics = document.getElementById('diagnostics');

const dayBtn = document.getElementById('day');
const monthBtn = document.getElementById('month');
const yearBtn = document.getElementById('year');
const totalBtn = document.getElementById('total');


/* EVENT LISTENERS
---------------------------------------------------------------------------------------------------- */

// Event listeners for day/month/year/total interface controls
dayBtn.addEventListener('click', () => {
  showDay(currentYear, currentMonth, currentDay);
});

monthBtn.addEventListener('click', () => {
  showMonth(currentYear, currentMonth);
});

yearBtn.addEventListener('click', () => {
  showYear(currentYear);
});

totalBtn.addEventListener('click', () => {
  showTotal();
});

// Event listeners for prev and next buttons
prevBtn.addEventListener("click", updatePrev);
nextBtn.addEventListener("click", updateNext);

// Draw the initial chart
newChart(jsonFileName);
diagnostics.innerHTML = `<b>currentView:</b> ${currentView}, <b>currentYear:</b> ${currentYear}, <b>currentMonth:</b> ${currentMonth}, <b>currentDay:</b> ${currentDay}`;

/* FUNCTIONS
---------------------------------------------------------------------------------------------------- */

// Main chart drawing function
function newChart(jsonFileName) {
  // Grab current year and month from JSON filename
  currentYear = Number(jsonFileName.substring(0, 4));
  currentMonth = Number(jsonFileName.substring(6, 8));
  updatePrevNextLabel(currentYear, currentMonth, currentDay);
  fetch(jsonFileName)
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
                pointStyle: 'circle', // Keep the pointStyle, but we'll override the label
                generateLabels: (chart) => {
                  const original = Chart.defaults.plugins.legend.labels.generateLabels;
                  const labels = original(chart);
                  labels.forEach(label => {
                    const dataset = chart.data.datasets[label.datasetIndex];
                    const isHidden = dataset.hidden;
                    label.text = (isHidden ? '\u2610 ' : '\u2611 ') + label.text; // Use unchecked and checked box unicode characters
                    label.fontColor = isHidden? '#666': '#000';
                  });
                  return labels;
                }
              }
              // labels: {
              //   usePointStyle: true,
              //   pointStyle: 'circle'
              // }
            }
          },
          onClick: (event, elements) => {
            // Grab the x-axis label of the clicked element
            const xAxisLabel = myChart.data.labels[elements[0].index];
            console.log('X-Axis Label:', xAxisLabel);
            // Set the new year, month, and day values based on the clicked element
            currentYear = Number(xAxisLabel.substring(0, 4));
            currentMonth = Number(xAxisLabel.substring(5, 7));
            currentDay = Number(xAxisLabel.substring(8, 10));
            // Determine what is the current view (total, year, month, day), then call the appropriate function to drill down
            switch (currentView) {
              case "total":
                showYear(currentYear);
                break;
              case "year":
                showMonth(currentYear, currentMonth);
                break;
              case "month":
                showDay(currentYear, currentMonth, currentDay);
                break;
              case "day":
                // We cannot drill down any further
                break;
              default:
                console.log("Invalid currentView");
                break;
            };
          },
          onHover: (event, chartElement) => {
            event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
          },
          maintainAspectRatio: false
        }
      });
    })
    .catch(error => {
      console.error(`Error fetching data for file: ${jsonFileName}`, error);
    });
  diagnostics.innerHTML = `<b>currentView:</b> ${currentView}, <b>currentYear:</b> ${currentYear}, <b>currentMonth:</b> ${currentMonth}, <b>currentDay:</b> ${currentDay}`;
};

// Function to show a single day, hour-by-hour
function showDay(year, month, day) {
  month = String(month).padStart(2, '0');
  let newJsonFileName = `${year}-${month}.json`;
  console.log(`newJsonFileName: ${newJsonFileName}`);
  fetch(newJsonFileName)
    .then(response => response.json())
    .then(data => {
      // **Update ghgData here with the newly fetched data**
      ghgData = data;

      const dailyData = [];
      ghgData.datasets.forEach(dataset => {
        const datasetDailyData = [];
        const data = []; // Initialize data array

        for (let i = 0; i < 24; i++) { // Iterate through all 24 hours
          const hour = String(i).padStart(2, '0');
          const expectedTime = `${ghgData.datasets[0].data[0].x.slice(0, 8)}${String(day).padStart(2, '0')} ${hour}:00:00`; // Construct the expected time string

          const dataPoint = dataset.data.find(item => item.x === expectedTime);
          data.push(dataPoint ? dataPoint.y : 0); // Use data or 0 if missing
        }

        dataset.data.forEach(item => {
          const itemDay = parseInt(item.x.slice(8, 10));
          if (itemDay === day) {
            datasetDailyData.push(item);
          }
        });
        //console.log(datasetDailyData);
        dailyData.push({
          label: dataset.label,
          data: data, // Use the correctly aligned data array
          backgroundColor: dataset.backgroundColor
        });
        //console.log(dailyData);
      });
      // TO DO: We somehow need to update the chart so that there is no mouse pointer over the bars - you can't drill down any further

      myChart.data.labels = Array.from({ length: 24 }, (_, i) => {
        const hour = String(i).padStart(2, '0');
        return `${ghgData.datasets[0].data[0].x.slice(0, 8)}${String(day).padStart(2, '0')} ${hour}:00:00`; //Hourly labels
      });
      myChart.data.datasets = dailyData;
      currentView = "day";
      diagnostics.innerHTML = `<b>currentView:</b> ${currentView}, <b>currentYear:</b> ${currentYear}, <b>currentMonth:</b> ${currentMonth}, <b>currentDay:</b> ${currentDay}`;
      // TO DO: Decide how to handle next/prev button availability

      updatePrevNextLabel(currentYear, currentMonth, currentDay);
      myChart.update();
      console.log(`currentView: ${currentView}, currentYear: ${currentYear}, currentMonth: ${currentMonth}, currentDay: ${currentDay}`);
    })
    .catch(error => {
      console.error(`Error fetching data for file: ${newJsonFileName}`, error);
    });
};


// Function to show a single month, day-by-day
function showMonth(year, month) {
  month = String(month).padStart(2, '0');
  let newJsonFileName = `${year}-${month}.json`;
  console.log(`newJsonFileName: ${newJsonFileName}`);
  fetch(newJsonFileName)
    .then(response => response.json())
    .then(data => {
      // Replace ghgData with the newly fetched data
      ghgData = data;
      const allDailyTotals = {};
      ghgData.datasets.forEach(dataset => {
        const dailyTotals = {};
        dataset.data.forEach(item => {
          const date = item.x.slice(0, 10);
          if (!dailyTotals[date]) {
            dailyTotals[date] = 0;
          }
          dailyTotals[date] += item.y;
        });
        allDailyTotals[dataset.label] = dailyTotals;
      });

      myChart.data.labels = Object.keys(allDailyTotals[ghgData.datasets[0].label]);
      myChart.data.datasets = ghgData.datasets.map(dataset => {
        const datasetDailyTotals = allDailyTotals[dataset.label];
        const data = Object.keys(datasetDailyTotals).map(date => datasetDailyTotals[date]);
        return {
          label: dataset.label,
          data: data,
          backgroundColor: dataset.backgroundColor
        };
      });
      myChart.update();
      currentView = "month";
      currentYear = year;
      currentMonth = month;
      currentDay = null;

      updatePrevNextLabel(currentYear, currentMonth, currentDay);
      diagnostics.innerHTML = `<b>currentView:</b> ${currentView}, <b>currentYear:</b> ${currentYear}, <b>currentMonth:</b> ${currentMonth}, <b>currentDay:</b> ${currentDay}`;
    })
    .catch(error => {
      console.error(`Error fetching data for file: ${newJsonFileName}`, error);
    });
}


// Function to show a single year, month-by-month
function showYear(year) {
  // We need to load the JSON for the year
  let newJsonFileName = `${year}.json`;
  fetch(newJsonFileName)
    .then(response => response.json())
    .then(data => {
      // Process the fetched data here
      myChart.data = data;
      myChart.update();
      // Update global variables
      currentView = "year";
      currentYear = year;
      currentMonth = null;
      currentDay = null;
      // if the current year is 2021 (or earlier), disable the prev button
      prev.disabled = (year <= 2021) ? true : false;
      // if the current year is 2026 (or later), disable the next button
      next.disabled = (year >= 2026) ? true : false;
      updatePrevNextLabel(currentYear, currentMonth, currentDay);
      diagnostics.innerHTML = `<b>currentView:</b> ${currentView}, <b>currentYear:</b> ${currentYear}, <b>currentMonth:</b> ${currentMonth}, <b>currentDay:</b> ${currentDay}`;
    })
    .catch(error => {
      console.error(`Error fetching data for file: ${newJsonFileName}`, error);
    });
};

// Function to show all time
function showTotal() {
  // We need to load the JSON for the year
  let newJsonFileName = `total.json`;
  fetch(newJsonFileName)
    .then(response => response.json())
    .then(data => {
      // Process the fetched data here
      myChart.data = data;
      myChart.update();
    })
    .catch(error => {
      console.error(`Error fetching data for file: ${newJsonFileName}`, error);
    });
  currentView = "total";
  currentYear = null;
  currentMonth = null;
  currentDay = null;
  // No need for prev/next buttons
  prev.disabled = true;
  next.disabled = true;
  updatePrevNextLabel(currentYear, currentMonth, currentDay);
  diagnostics.innerHTML = `<b>currentView:</b> ${currentView}, <b>currentYear:</b> ${currentYear}, <b>currentMonth:</b> ${currentMonth}, <b>currentDay:</b> ${currentDay}`;
};

// Function to handle PREVIOUS view logic
function updatePrev() {
  // Re-enable the prev button in case it was disabled
  prev.disabled = false;
  switch (currentView) {
    case "total":
      // The prev button is not needed
      prev.disabled = true;
      break;
    case "year":
      // If the current year is 2021, we can't go back
      if (currentYear === 2021) {
        prev.disabled = true;
      } else {
        showYear(currentYear - 1);
      };
      break;
    case "month":
      // If current month is January, then back to December of previous year  
      if (currentMonth === 1) {
        currentYear --;
        currentMonth = 12;
      } else {
        currentMonth --;
      };
      showMonth(currentYear, currentMonth);      
      break;
    case "day":
      // if current day is first day of the month, then back to the last day of the previous month
      if (currentDay === 1) {
        // if it is January, then decrement the year, and go to December 31
        if (currentMonth === 1) {
          currentYear --;
          currentMonth = 12;
          currentDay = 31;
        } else {
          // it is not January, so just go back a month
          currentMonth --;
          // Determine what the last day of the month is (subtracting one because JS dates are zero-indexed)
          currentDay = daysInMonth(currentYear, currentMonth - 1);
        };
      } else {
        currentDay --;
      };
      showDay(currentYear, currentMonth, currentDay);
      break;
    default:
      console.log("Invalid currentView");
      break;
  };
  updatePrevNextLabel(currentYear, currentMonth, currentDay);
};

function updateNext() {
  // Re-enable the next button in case it was disabled
  next.disabled = false;
  switch (currentView) {
    case "total":
      // The next button is not needed
      next.disabled = true;
      break;
    case "year":
      // If the current year is 2026, we can't go forward
      if(currentYear === 2026) {
        next.disabled = true;
      } else {
        showYear(currentYear + 1);
      };
      break;
    case "month":
      // If the current month is December, then on to January of the next year
      if (currentMonth === 12) {
        currentYear ++;
        currentMonth = 1;
      } else {
        currentMonth ++;
      };
      showMonth(currentYear, currentMonth);
      break;
    case "day":
      // If current day is the last day of the month, then on to the first day of the next month
      let lastDay = isLastDayOfMonth(currentYear, currentMonth + 1, currentDay);
      if (lastDay) {
        // If it is December 31, go to January
        if (currentMonth === 12) {
          currentMonth = 1;
        } else {
          currentMonth ++;
        };
        // We are now at the first of the month
        currentDay = 1;
      } else {
        // It is some other day of the month, so on the the next day
        currentDay ++;
      };
      showDay(currentYear, currentMonth, currentDay);
      break;
    default:
      console.log("Invalid currentView");
      break;
  };
  updatePrevNextLabel(currentYear, currentMonth, currentDay);
};

function updatePrevNextLabel(year, month, day) {
  // We may need a leading zero for the month and/or day
  let monthLeadingZero = String(month).padStart(2, '0');
  let dayLeadingZero = String(day).padStart(2, '0');
  switch (currentView) {
    case "total":
      prevNextLabel.textContent = `Total`;
      break;
    case "year":
      prevNextLabel.textContent = `${year}`;
      break;
    case "month":
      prevNextLabel.textContent = `${year}-${monthLeadingZero}`;
      break;
    case "day":
      prevNextLabel.textContent = `${year}-${monthLeadingZero}-${dayLeadingZero}`;
      break;
    default:
      alert("Invalid currentView: " + currentView);
      break;
  };
};

// Find the number of days in a specific month (thanks to https://stackoverflow.com/questions/1184334/get-number-days-in-a-specified-month-using-javascript)
function daysInMonth (year, month) {
  return new Date(parseInt(year), parseInt(month) + 1, 0).getDate();
}

// Determine whether a particular day represents the last day of a given month (thanks to Gemini for this one) - remember the month in JS is zero-indexed
function isLastDayOfMonth(year, month, day) {
  const nextDay = new Date(year, month, day + 1); // Create date object for the next day
  return nextDay.getDate() === 1; // Check if the next day is the 1st of the next month
}