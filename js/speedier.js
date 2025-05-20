/* TODO

JSON files with hourly data for each month
- Name files in the format YYYY-MM.json
- powers month and day views

JSON files with monthly data for each year
- Name files in the format YYYY.json
- powers year and total views

JSON file for all time
- Powers total view
*/

/* CONSTANTS AND VARIABLES
---------------------------------------------------------------------------------------------------- */

// Initialize variables
let dataPath = "data/";
let jsonFileName = `${dataPath}GHGIS-total.json`;
let ghgData;
let myChart;
let currentView = "total"; // Start with total view upon startup
let currentYear = null;
let currentMonth = null;
let currentDay = null;

// Collect interface control elements
const prevBtn = document.getElementById('prev');
const prevNextLabel = document.getElementById('prevNextLabel');
const nextBtn = document.getElementById('next');

const diagnostics = document.getElementById('diagnostics');

const datePicker = document.getElementById("date");
const dayBtn = document.getElementById('day');
const monthBtn = document.getElementById('month');
const yearBtn = document.getElementById('year');
const totalBtn = document.getElementById('total');


/* EVENT LISTENERS
---------------------------------------------------------------------------------------------------- */

// Event listeners for day/month/year/total interface controls
// Event listener for the date picker
datePicker.addEventListener("change", () => {
  const selectedDateString = datePicker.value; // Gets the date in 'YYYY-MM-DD' format

  if (selectedDateString) { // Make sure a date was actually selected
    // Parse the date string
    const [year, month, day] = selectedDateString.split('-').map(Number);

    // Call your showDay function
    // Note: The 'month' obtained from split().map(Number) will be 1-indexed (e.g., 1 for January)
    // which seems to be what your showDay function expects based on your padStart(2, '0') usage.
    showDay(year, month, day);

    // Optional: You might want to update currentYear, currentMonth, currentDay here
    // to reflect the newly selected date for other button logic.
    currentYear = year;
    currentMonth = month;
    currentDay = day;

    // Optional: Update the prevNextLabel to reflect the new date
    updatePrevNextLabel(currentYear, currentMonth, currentDay);

  } else {
    // Handle case where date is cleared or invalid
    console.warn("No date selected or invalid date.");
  }
});

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

/* PRIMARY FUNCTIONS
---------------------------------------------------------------------------------------------------- */

// Main chart drawing function
function newChart(jsonFileName) {
  // Grab current year and month from JSON filename (don't think I need to do this, actually)
  // currentYear = Number(jsonFileName.substring(0, 4));
  // currentMonth = Number(jsonFileName.substring(6, 8));
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
                pointStyle: 'circle'
              }
            }
          },
          onClick: (event, elements) => {
            // Grab the x-axis label of the clicked element
            const xAxisLabel = myChart.data.labels[elements[0].index];
            // console.log('X-Axis Label:', xAxisLabel);
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
            // If we are on the day view, hovering over a chart bar should not feature a mouse pointer - as the user cannot drill down any further
            if (currentView === 'day') {
              event.native.target.style.cursor = 'default';
            } else {
              event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
            };
          },
          maintainAspectRatio: false
        }
      });
      // Enable/disable appropriate buttons
      dayBtn.disabled = true;
      monthBtn.disabled = true;
      yearBtn.disabled = true;
      totalBtn.disabled = false;
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      updateDatePickerValue();
    })
    .catch(error => {
      console.error(`Error fetching data for file: ${jsonFileName}`, error);
      updateDatePickerValue();
    });
  diagnostics.innerHTML = `<b>currentView:</b> ${currentView}, <b>currentYear:</b> ${currentYear}, <b>currentMonth:</b> ${currentMonth}, <b>currentDay:</b> ${currentDay}`;
};

// Function to show a single day, hour-by-hour
function showDay(year, month, day) {
  let monthLeadingZero = String(month).padStart(2, '0');
  let newJsonFileName = `${dataPath}GHGIS-${year}-${monthLeadingZero}.json`;
  // console.log(`newJsonFileName: ${newJsonFileName}`);
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

      myChart.data.labels = Array.from({ length: 24 }, (_, i) => {
        const hour = String(i).padStart(2, '0');
        return `${ghgData.datasets[0].data[0].x.slice(0, 8)}${String(day).padStart(2, '0')} ${hour}:00:00`; //Hourly labels
      });
      myChart.data.datasets = dailyData;
      currentView = "day";
      diagnostics.innerHTML = `<b>currentView:</b> ${currentView}, <b>currentYear:</b> ${currentYear}, <b>currentMonth:</b> ${currentMonth}, <b>currentDay:</b> ${currentDay}`;
      // Enable/disable appropriate buttons
      dayBtn.disabled = false;
      monthBtn.disabled = false;
      yearBtn.disabled = false;
      totalBtn.disabled = false;
      // if we are displaying July 1, 2021, disable the prev button (we have no prior data)
      // console.warn(`year: ${year} month: ${month} day: ${day} evaluates to: ${isDateBeforeRange(year, month, day)}`);
      if (isDateBeforeRange(year, month, day) === true) {
        prevBtn.disabled = false;
      } else {
        prevBtn.disabled = true;
      };
      // if we are displaying June 30, 2026, disable the next button (data collection ends on this date)
      if (isDateAfterRange(year, month, day) === true) {
        nextBtn.disabled = false;
      } else {
        nextBtn.disabled = true;
      };
      updatePrevNextLabel(currentYear, currentMonth, currentDay);
      updateDatePickerValue();
      myChart.update();
      // console.log(`currentView: ${currentView}, currentYear: ${currentYear}, currentMonth: ${currentMonth}, currentDay: ${currentDay}`);
    })
    .catch(error => {
      console.error(`Error fetching data for file: ${newJsonFileName}`, error);
      alert(`No data available for the DAY: ${year}-${month}-${day}`);
      // We need to update the prevNextLabel to go back one day, because it was just advanced
      
      // If this is the first day of the year, we need to roll back to December 31 of the previous year
      // console.warn(`day = ${day}, month = ${month}, year = ${year}`);
      if (month === 1 & day === 1) {
        // currentMonth goes back to 1, and currentDay goes back to 31
        currentYear--;
        currentMonth = 12;
        currentDay = 31;
        // console.warn("We are on the first day of the year, but there is no data for this.");
      // Else if this is the first day of the month, we need to roll back to the last day of the previous month
      } else if (day === 1) {
        // Decrement currentMonth isLastDayOfMonth(year, month, day)
        currentMonth--;
        // Find out how many days are in currentMonth, and set currentDay to that number
        currentDay = daysInMonth(currentYear, currentMonth);
        // console.warn("We are on the last day of the month!");
      };
      updatePrevNextLabel(currentYear, currentMonth, currentDay);
      updateDatePickerValue();
    });
};


// Function to show a single month, day-by-day
function showMonth(year, month) {
  let monthLeadingZero = String(month).padStart(2, '0');
  let newJsonFileName = `${dataPath}GHGIS-${year}-${monthLeadingZero}.json`;
  // console.log(`newJsonFileName: ${newJsonFileName}`);
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
      // Enable/disable appropriate buttons
      dayBtn.disabled = true;
      monthBtn.disabled = false;
      yearBtn.disabled = false;
      totalBtn.disabled = false;
      updatePrevNextLabel(currentYear, currentMonth, currentDay);
      updateDatePickerValue();
      diagnostics.innerHTML = `<b>currentView:</b> ${currentView}, <b>currentYear:</b> ${currentYear}, <b>currentMonth:</b> ${currentMonth}, <b>currentDay:</b> ${currentDay}`;
    })
    .catch(error => {
      console.error(`Error fetching data for file: ${newJsonFileName}`, error);
      alert(`No data available for the MONTH: ${year}-${month}`);
      // We need to update the prevNextLabel to go back one month, because it was just advanced
      if (month == 1) {
        currentMonth = 12;
        currentYear --;
      } else {
        currentMonth --;
      }
      updatePrevNextLabel(currentYear, currentMonth, null);
      updateDatePickerValue();
    });
}


// Function to show a single year, month-by-month
function showYear(year) {
  // We need to load the JSON for the year
  let newJsonFileName = `${dataPath}GHGIS-${year}.json`;
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
      // Enable/disable appropriate buttons
      dayBtn.disabled = true;
      monthBtn.disabled = true;
      yearBtn.disabled = false;
      totalBtn.disabled = false;
      // if the current year is 2021 (or earlier), disable the prev button
      prevBtn.disabled = (year <= 2021) ? true : false;
      // if the current year is 2026 (or later), disable the next button
      nextBtn.disabled = (year >= 2026) ? true : false;
      updatePrevNextLabel(currentYear, currentMonth, currentDay);
      updateDatePickerValue();
      diagnostics.innerHTML = `<b>currentView:</b> ${currentView}, <b>currentYear:</b> ${currentYear}, <b>currentMonth:</b> ${currentMonth}, <b>currentDay:</b> ${currentDay}`;
    })
    .catch(error => {
      console.error(`Error fetching data for file: ${newJsonFileName}`, error);
      alert(`No data available for the YEAR: ${year}`);
      // We need to update the prevNextLabel to go back one year, because it was just advanced
      currentYear --;
      updatePrevNextLabel(currentYear, null, null);
      updateDatePickerValue();
    });
};

// Function to show all time
function showTotal() {
  // We need to load the JSON for the year
  let newJsonFileName = `${dataPath}GHGIS-total.json`;
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
  // Enable/disable appropriate buttons
  prevBtn.disabled = true;
  nextBtn.disabled = true;
  dayBtn.disabled = true;
  monthBtn.disabled = true;
  yearBtn.disabled = true;
  totalBtn.disabled = false;
  updatePrevNextLabel(currentYear, currentMonth, currentDay);
  updateDatePickerValue();
  diagnostics.innerHTML = `<b>currentView:</b> ${currentView}, <b>currentYear:</b> ${currentYear}, <b>currentMonth:</b> ${currentMonth}, <b>currentDay:</b> ${currentDay}`;
};

// Function to handle PREVIOUS view logic
function updatePrev() {
  // Re-enable the prevBtn button in case it was disabled
  prevBtn.disabled = false;
  switch (currentView) {
    case "total":
      // The prevBtn button is not needed
      prevBtn.disabled = true;
      break;
    case "year":
      // If the current year is 2021, we can't go back
      if (currentYear === 2021) {
        prevBtn.disabled = true;
      } else {
        showYear(currentYear - 1);
      };
      break;
    case "month":
      // If current month is January, then back to December of previous year;
      if (currentMonth === 1) {
        currentYear--;
        currentMonth = 12;
      } else {
        currentMonth--;
      };
      // console.log(`currentYear = ${currentYear}, and currentMonth = ${currentMonth}!`);
      showMonth(currentYear, currentMonth);
      break;
    case "day":
      // if current day is first day of the month, then back to the last day of the previous month
      if (currentDay === 1) {
        // if it is January, then decrement the year, and go to December 31
        if (currentMonth === 1) {
          currentYear--;
          currentMonth = 12;
          currentDay = 31;
        } else {
          // it is not January, so just go back a month
          currentMonth--;
          // Determine what the last day of the month is (subtracting one because JS dates are zero-indexed)
          currentDay = daysInMonth(currentYear, currentMonth - 1);
        };
      } else {
        currentDay--;
      };
      showDay(currentYear, currentMonth, currentDay);
      break;
    default:
      console.log("Invalid currentView");
      break;
  };
  updatePrevNextLabel(currentYear, currentMonth, currentDay);
  updateDatePickerValue();
};

function updateNext() {
  // Re-enable the nextBtn button in case it was disabled
  nextBtn.disabled = false;
  switch (currentView) {
    case "total":
      // The nextBtn button is not needed
      nextBtn.disabled = true;
      break;
    case "year":
      // If the current year is 2026, we can't go forward
      if (currentYear === 2026) {
        nextBtn.disabled = true;
      } else {
        currentYear++;
        showYear(currentYear);
      };
      break;
    case "month":
      // If the current month is December, then on to January of the next year
      if (currentMonth === 12) {
        currentYear++;
        currentMonth = 1;
      } else {
        currentMonth++;
      };
      showMonth(currentYear, currentMonth);
      break;
    case "day":
      // If current day + 1 is the last day of the month, then on to the first day of the next month (currentMonth needs to be converted to month as zero-indexed for JS)
      let lastDay = isLastDayOfMonth(currentYear, currentMonth - 1, currentDay);
      // console.log(`lastDay = ${lastDay} and currentMonth = ${currentMonth}`);
      if (lastDay) {
        // If it is December 31, go to January of next year
        if (currentMonth === 12) {
          currentMonth = 1;
          currentYear++;
        } else {
          currentMonth++;
        };
        // We are now at the first of the month
        currentDay = 1;
      } else {
        currentDay++;
      };
      showDay(currentYear, currentMonth, currentDay);
      break;
    default:
      console.log("Invalid currentView");
      break;
  };
  updatePrevNextLabel(currentYear, currentMonth, currentDay);
  updateDatePickerValue();
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


/* UTILITY FUNCTIONS
---------------------------------------------------------------------------------------------------- */

// Find the number of days in a specific month (thanks to https://stackoverflow.com/questions/1184334/get-number-days-in-a-specified-month-using-javascript)
function daysInMonth(year, month) {
  return new Date(parseInt(year), parseInt(month) + 1, 0).getDate();
};

// Determine whether a particular day represents the last day of a given month (thanks to Gemini for this one) - remember the month in JS is zero-indexed
function isLastDayOfMonth(year, month, day) {
  const nextDay = new Date(year, month, day + 1); // Create date object for the next day
  return nextDay.getDate() === 1; // Check if the next day is the 1st of the next month
};

function isDateBeforeRange(year, month, day) {
  // Function to see if the date being requested by the user is outside of the project range
  // JavaScript Date months are 0-indexed (0 for Jan, 11 for Dec),
  const viewedDate = new Date(year, month - 1, day);
  const startBoundary = new Date(2021, 6, 1);
  return viewedDate > startBoundary;
};

function isDateAfterRange(year, month, day) {
  // Function to see if the date being requested by the user is outside of the project range
  // JavaScript Date months are 0-indexed (0 for Jan, 11 for Dec),
  const viewedDate = new Date(year, month - 1, day);
  const endBoundary = new Date(2026, 5, 30);
  return viewedDate < endBoundary;
};

function updateDatePickerValue() {
  // Only update if currentYear, currentMonth, and currentDay are not null (i.e., not in 'total' view initially)
  if (currentYear !== null && currentMonth !== null && currentDay !== null) {
    // Ensure month and day have leading zeros if they are single digits
    const formattedMonth = String(currentMonth).padStart(2, '0');
    const formattedDay = String(currentDay).padStart(2, '0');

    // Construct the date string in 'YYYY-MM-DD' format
    const dateString = `${currentYear}-${formattedMonth}-${formattedDay}`;

    // Set the value of the date input
    datePicker.value = dateString;
  } else {
    // If in 'total' or other view where a specific day isn't selected,
    // you might want to clear the date picker or set it to a default.
    // For now, let's just clear it if not in a day/month/year view.
    datePicker.value = '';
  }
};