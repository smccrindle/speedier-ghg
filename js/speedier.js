/* SPEEDIER GHG ACCOUNTING AND REPORTING DASHBOARD

This application allows visitors to view the GHG emission reductions made possible by each of the 
Distributed Energy Resources (DER) that comprise the SPEEDIER smart grid system, in isolation or 
in aggregate.

The dashboard is powered by the amazing Chart.js (https://www.chartjs.org/), which fetches the data 
from a collection of yearly and monthly JSON files:

JSON files with hourly data for each month
- files are named in the format GHGIS-YYYY-MM.json
- powers month and day views

JSON files with monthly data for each year
- files are named in the format GHGIS-YYYY.json
- powers year views

JSON file for all time
- GHGIS-total.json
- Powers total view

The dashboard also renders an information panel that reports the GHG emission reductions in everyday 
equivalent terms so that the lay person can appreciate what the data - described in tonnes of CO2 
equivalent - actually mean.

Thanks to the great team at Lakeland Solutions, Georgian College Research and Innovation, Georgian 
College Computer Studies, students from the Georgian College Research Analyst and the Big Data 
programs, Natural Resources Canada, the Township of Parry Sound, the GHG Management Institute, and 
many others who helped to make this visualization tool a reality.
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
let datasetVisibility = new Map(); // Stores { "AssetLabel": boolean (true for hidden, false for visible) }

// Collect interface control elements
const prevBtn = document.getElementById('prev');
const prevNextLabel = document.getElementById('prevNextLabel');
const nextBtn = document.getElementById('next');
const datePicker = document.getElementById("date");
const monthBtn = document.getElementById('month');
const yearBtn = document.getElementById('year');
const totalBtn = document.getElementById('total');

// GHG equivalents information panel
const ghgEquivPanel = document.getElementById("ghgEquivalents");
const ghgEquivTotal = document.querySelector("#ghgEquivalents > data");
const ghgEquivCar = document.querySelector("#ghgEquivalents ul li:nth-of-type(1)");
const ghgEquivGas = document.querySelector("#ghgEquivalents ul li:nth-of-type(2)");
const ghgEquivPhone = document.querySelector("#ghgEquivalents ul li:nth-of-type(3)");
const ghgEquivTrash = document.querySelector("#ghgEquivalents ul li:nth-of-type(4)");
const ghgEquivLed = document.querySelector("#ghgEquivalents ul li:nth-of-type(5)");
const ghgEquivTree = document.querySelector("#ghgEquivalents ul li:nth-of-type(6)");

// Other interface elements
const chartMessageOverlay = document.getElementById('chartMessage');
const messageTextElement = document.getElementById('messageText');
const messageOkBtn = document.getElementById('messageOkBtn');


/* EVENT LISTENERS
---------------------------------------------------------------------------------------------------- */

// Event listeners for date picker and month/year/total interface controls

datePicker.addEventListener("change", async () => {
	const selectedDateString = datePicker.value; // Gets the date in 'YYYY-MM-DD' format
	if (selectedDateString) { // Make sure a date was actually selected
		// Parse the date string
		const [year, month, day] = selectedDateString.split('-').map(Number);
		console.log(`${year}-${month}-${day}: isDateBeforeRange = ${isDateBeforeRange(year, month, day)} and isDateAfterRange = ${isDateAfterRange(year, month, day)}`);
		// We need to check here whether the selected date is within the acceptable range
		if ((isDateBeforeRange(year, month, day) === false) & (isDateAfterRange(year, month, day) === false)) {
			let possibleJsonFileName = `${dataPath}GHGIS-${year}-${String(month).padStart(2, '0')}.json`;
			// console.warn(`${possibleJsonFileName} exists: ${await checkIfFileExists(possibleJsonFileName)}`);
			// if JSON file for requested year and month exists, proceed
			if (await checkIfFileExists(possibleJsonFileName) === true) {
				// We are good - there is data so let's go
				showDay(year, month, day);
				// Update the current date variables
				currentYear = year;
				currentMonth = month;
				currentDay = day;
			} else {
				// The date is within the project reporting range, but there is no data ready for this month, yet
				datePicker.value = "";
				showChartMessage("No data is available yet for the selected date.");
			};
		} else {
			// User asked for date outside of reporting range
			datePicker.value = "";
			showChartMessage("Selected date is outside of the reporting range for the project.");
		}
		updatePrevNextLabel(currentYear, currentMonth, currentDay);
	} else {
		// Handle case where date is cleared or invalid
		datePicker.value = "";
		showChartMessage("No date selected or invalid date.");
	}
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

// Event listener for OK to confirm and close out error message overlay
messageOkBtn.addEventListener('click', () => {
	hideChartMessage();
});


/* DRAW INITIAL CHART
---------------------------------------------------------------------------------------------------- */

newChart(jsonFileName);
diagnostics.innerHTML = `<b>currentView:</b> ${currentView}, <b>currentYear:</b> ${currentYear}, <b>currentMonth:</b> ${currentMonth}, <b>currentDay:</b> ${currentDay}`;


/* PRIMARY FUNCTIONS
---------------------------------------------------------------------------------------------------- */

// Main chart drawing function
function newChart(jsonFileName) {
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
							},
							grid: {
								// The zero line for the Y axis needs to stand out a bit
								color: ({ tick }) => tick.value === 0 ? "rgba(0, 0, 0, 1)" : "rgba(0, 0, 0, 0.1)"
							}
						}
					},
					plugins: {
						legend: {
							onClick: (event, legendItem, legend) => {
								const index = legendItem.datasetIndex;
								const ci = legend.chart;
								// Toggle visibility in Chart.js data
								ci.data.datasets[index].hidden = !ci.data.datasets[index].hidden;
								// Update our persistent visibility map
								// legendItem.text gives you the label of the clicked item
								datasetVisibility.set(legendItem.text, ci.data.datasets[index].hidden);
								ci.update();
								// Get GHG net totals for rendering GHG equivalents
								const currentTotal = getChartTotalSum(myChart);
								ghgEquivalent(currentTotal);
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
						},
						tooltip: {
							mode: 'nearest',
							intersect: true,
							callbacks: {
								afterLabel: function (context) {
									const dataPoint = context.raw;
									if (dataPoint) { // Check if dataPoint itself is valid/exists
										if (dataPoint.comment) { // Check if comment has a value - comments can be added to data points in JSON files
											return 'Note: ' + dataPoint.comment;
										}
									}
									return '';
								}
							}
						}
					},
					onClick: (event, elements) => {
						// Grab the x-axis label of the clicked element
						const xAxisLabel = myChart.data.labels[elements[0].index];
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
								// We cannot drill down any further from the day view - there is no hour view
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
					maintainAspectRatio: false // Important for responsive chart rendering - particularly with different layouts (see CSS)
				}
			});

			// Get GHG net totals for rendering GHG equivalents
			const currentTotal = getChartTotalSum(myChart);
			ghgEquivalent(currentTotal);

			// Enable/disable appropriate buttons
			monthBtn.disabled = true;
			yearBtn.disabled = true;
			totalBtn.disabled = true;
			prevBtn.disabled = true;
			nextBtn.disabled = true;
			updateDatePickerValue();
			// Clear out any error message
			hideChartMessage();
		})
		.catch(error => {
			console.error(`Error fetching data for file: ${jsonFileName}`, error);
			updateDatePickerValue();
		});
	diagnostics.innerHTML = `<b>currentView:</b> ${currentView}, <b>currentYear:</b> ${currentYear}, <b>currentMonth:</b> ${currentMonth}, <b>currentDay:</b> ${currentDay}`;
};

// SHOW DAY: Function to show a single day, hour-by-hour
function showDay(year, month, day) {
	let monthLeadingZero = String(month).padStart(2, '0');
	let newJsonFileName = `${dataPath}GHGIS-${year}-${monthLeadingZero}.json`;
	fetch(newJsonFileName)
		.then(response => response.json())
		.then(data => {
			ghgData = data;
			const dailyData = [];
			ghgData.datasets.forEach(dataset => {
				const fullHourlyDataPoints = []; // We will store full objects here
				const expectedDatePrefix = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`; // Pre-calculate date prefix for easier comparison
				// Create a map for quick lookup of data points by their 'x' value for the current dataset
				const dataPointMap = new Map(dataset.data.map(item => [item.x, item]));
				for (let i = 0; i < 24; i++) { // Iterate through all 24 hours
					const hour = String(i).padStart(2, '0');
					const expectedTime = `${expectedDatePrefix} ${hour}:00:00`;
					const dataPoint = dataPointMap.get(expectedTime); // Get the full object if it exists
					if (dataPoint) {
						fullHourlyDataPoints.push(dataPoint); // Push the original object including 'x', 'y', and 'comment'
					} else {
						// If no data for this hour, create a placeholder object
						fullHourlyDataPoints.push({
							x: expectedTime,
							y: 0,
							// No comment needed for zero/missing data points
						});
					}
				}
				dailyData.push({
					label: dataset.label,
					data: fullHourlyDataPoints, // Assign the array of full objects
					backgroundColor: dataset.backgroundColor
				});
			});
			// Update labels from the first dataset's new data (since it now contains x values)
			myChart.data.labels = dailyData[0].data.map(item => item.x);
			myChart.data.datasets = dailyData;
			// Check to see what legend labels are enabled/disabled
			myChart.data.datasets.forEach(dataset => {
				if (datasetVisibility.has(dataset.label)) {
					// If we have a stored state for this dataset, apply it
					dataset.hidden = datasetVisibility.get(dataset.label);
				} else {
					// If no stored state (on first load, for example), ensure it's visible by default
					dataset.hidden = false;
				}
			});
			currentView = "day";
			diagnostics.innerHTML = `<b>currentView:</b> ${currentView}, <b>currentYear:</b> ${currentYear}, <b>currentMonth:</b> ${currentMonth}, <b>currentDay:</b> ${currentDay}`; // See HTML - this is set to display: none; with an inline style attribute so it can be easily made visible for debugging
			// Enable/disable appropriate buttons
			monthBtn.disabled = false;
			yearBtn.disabled = false;
			totalBtn.disabled = false;
			// if we are displaying July 1, 2021, disable the prev button (we have no prior data)
			if (year === 2021 & month === 7 & day === 1) {
				prevBtn.disabled = true;
			} else {
				prevBtn.disabled = false;
			};
			// if we are displaying June 30, 2026, disable the next button (data collection ends on this date)
			if (year === 2026 & month === 6 & day === 30) {
				nextBtn.disabled = true;
			} else {
				nextBtn.disabled = false;
			};
			updatePrevNextLabel(currentYear, currentMonth, currentDay);
			updateDatePickerValue();
			myChart.update();
			// Get GHG net totals for rendering GHG equivalents
			const currentTotal = getChartTotalSum(myChart);
			ghgEquivalent(currentTotal);
			// Clear out any error message
			hideChartMessage();
		})
		.catch(error => {
			console.error(`Error fetching data for file: ${newJsonFileName}`, error);
			showChartMessage(`No data available for the DAY: ${year}-${month}-${day}`);
			// We need to update the prevNextLabel to go back one day, because it was just advanced
			// If this is the first day of the year, we need to roll back to December 31 of the previous year
			if (month === 1 & day === 1) {
				// currentYear decrements, currentMonth goes back to 12, and currentDay goes back to 31
				currentYear--;
				currentMonth = 12;
				currentDay = 31;
				// Else if this is the first day of the month, we need to roll back to the last day of the previous month
			} else if (day === 1) {
				// Decrement currentMonth isLastDayOfMonth(year, month, day)
				currentMonth--;
				// Find out how many days are in currentMonth, and set currentDay to that number
				currentDay = daysInMonth(currentYear, currentMonth);
			};
			updatePrevNextLabel(currentYear, currentMonth, currentDay);
			updateDatePickerValue();
		});
};


// SHOW MONTH: Function to show a single month, day-by-day
function showMonth(year, month) {
	let monthLeadingZero = String(month).padStart(2, '0');
	let newJsonFileName = `${dataPath}GHGIS-${year}-${monthLeadingZero}.json`;
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
			// Check to see what legend labels are enabled/disabled
			myChart.data.datasets.forEach(dataset => {
				if (datasetVisibility.has(dataset.label)) {
					dataset.hidden = datasetVisibility.get(dataset.label);
				} else {
					dataset.hidden = false;
				}
			});
			myChart.update();
			// Get GHG net totals for rendering GHG equivalents
			const currentTotal = getChartTotalSum(myChart);
			ghgEquivalent(currentTotal);
			// Update global variables
			currentView = "month";
			currentYear = year;
			currentMonth = month;
			currentDay = null;
			// Enable/disable appropriate buttons
			monthBtn.disabled = true;
			yearBtn.disabled = false;
			totalBtn.disabled = false;
			// if we are displaying July 2021, disable the prevBtn (we have no prior data)
			if (year === 2021 & month === 7) {
				prevBtn.disabled = true;
			} else {
				prevBtn.disabled = false;
			};
			// if we are displaying June, 2026, disable the next button (data collection ends on this month)
			if (year === 2026 & month === 6) {
				nextBtn.disabled = true;
			} else {
				nextBtn.disabled = false;
			};
			updatePrevNextLabel(currentYear, currentMonth, currentDay);
			updateDatePickerValue();
			diagnostics.innerHTML = `<b>currentView:</b> ${currentView}, <b>currentYear:</b> ${currentYear}, <b>currentMonth:</b> ${currentMonth}, <b>currentDay:</b> ${currentDay}`; // See HTML - this is set to display: none; with an inline style attribute so it can be easily made visible for debugging
			// Enable/disable appropriate buttons
			// Clear out any error message
			hideChartMessage();
		})
		.catch(error => {
			console.error(`Error fetching data for file: ${newJsonFileName}`, error);
			showChartMessage(`No data available for the MONTH: ${year}-${month}`);
			// We need to update the prevNextLabel to go forward one month, because it was just decreased, but that data for that month does not exist - nor will it ever
			// if the visitor is trying to view a month less than July 2021, then stop them
			if (year === 2021 & month === 6) {
				currentMonth++;
			} else {
				// the visitor is trying to view a later month for which data is not available
				if (month === 1) {
					currentYear--;
					currentMonth = 12;
				} else {
					currentMonth--;
				}
			}
			updatePrevNextLabel(currentYear, currentMonth, null);
			updateDatePickerValue();
		});
}


// SHOW YEAR: Function to show a single year, month-by-month
function showYear(year) {
	// We need to load the JSON for the year
	let newJsonFileName = `${dataPath}GHGIS-${year}.json`;
	fetch(newJsonFileName)
		.then(response => response.json())
		.then(data => {
			// Process the fetched data here
			myChart.data = data;
			// Check to see what legend labels are enabled/disabled
			myChart.data.datasets.forEach(dataset => {
				if (datasetVisibility.has(dataset.label)) {
					dataset.hidden = datasetVisibility.get(dataset.label);
				} else {
					dataset.hidden = false;
				}
			});
			myChart.update();
			// Get GHG net totals for rendering GHG equivalents
			const currentTotal = getChartTotalSum(myChart);
			ghgEquivalent(currentTotal);
			// Update global variables
			currentView = "year";
			currentYear = year;
			currentMonth = null;
			currentDay = null;
			// Enable/disable appropriate buttons
			monthBtn.disabled = true;
			yearBtn.disabled = true;
			totalBtn.disabled = false;
			// if the current year is 2021 (or earlier), disable the prev button
			prevBtn.disabled = (year <= 2021) ? true : false;
			// if the current year is 2026 (or later), disable the next button
			nextBtn.disabled = (year >= 2026) ? true : false;
			updatePrevNextLabel(currentYear, currentMonth, currentDay);
			updateDatePickerValue();
			diagnostics.innerHTML = `<b>currentView:</b> ${currentView}, <b>currentYear:</b> ${currentYear}, <b>currentMonth:</b> ${currentMonth}, <b>currentDay:</b> ${currentDay}`; // See HTML - this is set to display: none; with an inline style attribute so it can be easily made visible for debugging
			// Enable/disable appropriate buttons
			// Clear out any error message
			hideChartMessage();
		})
		.catch(error => {
			console.error(`Error fetching data for file: ${newJsonFileName}`, error);
			showChartMessage(`No data available for the YEAR: ${year}`);
			// We need to update the prevNextLabel to go back one year, because it was just advanced
			currentYear--;
			updatePrevNextLabel(currentYear, null, null);
			updateDatePickerValue();
		});
};


// SHOW TOTAL: Function to show all time
function showTotal() {
	// We need to load the JSON total data
	let newJsonFileName = `${dataPath}GHGIS-total.json`;
	fetch(newJsonFileName)
		.then(response => response.json())
		.then(data => {
			// Process the fetched data here
			myChart.data = data;
			// Check to see what legend labels are enabled/disabled
			myChart.data.datasets.forEach(dataset => {
				if (datasetVisibility.has(dataset.label)) {
					dataset.hidden = datasetVisibility.get(dataset.label);
				} else {
					dataset.hidden = false;
				}
			});
			myChart.update();
			// Get GHG net totals for rendering GHG equivalents
			const currentTotal = getChartTotalSum(myChart);
			ghgEquivalent(currentTotal);
			// Clear out any error message
			hideChartMessage();
		})
		.catch(error => {
			console.error(`Error fetching data for file: ${newJsonFileName}`, error);
		});
	// Update global variables
	currentView = "total";
	currentYear = null;
	currentMonth = null;
	currentDay = null;
	// Enable/disable appropriate buttons
	prevBtn.disabled = true;
	nextBtn.disabled = true;
	monthBtn.disabled = true;
	yearBtn.disabled = true;
	totalBtn.disabled = true;
	updatePrevNextLabel(currentYear, currentMonth, currentDay);
	updateDatePickerValue();
	diagnostics.innerHTML = `<b>currentView:</b> ${currentView}, <b>currentYear:</b> ${currentYear}, <b>currentMonth:</b> ${currentMonth}, <b>currentDay:</b> ${currentDay}`; // See HTML - this is set to display: none; with an inline style attribute so it can be easily made visible for debugging
};


// UPDATE PREV: Function to handle previous view logic
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
	// Clear out any error message
	hideChartMessage();
};


// UPDATE NEXT: Function to handle NEXT view logic
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
	// Clear out any error message
	hideChartMessage();
};

// UPDATE PREV NEXT LABEL: Function to update text label in between previous and next buttons
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
			console.warn("Invalid chart view mode: " + currentView);
			break;
	};
};


/* UTILITY FUNCTIONS
---------------------------------------------------------------------------------------------------- */

// DAYS IN MONTH: Find the number of days in a specific month (thanks to https://stackoverflow.com/questions/1184334/get-number-days-in-a-specified-month-using-javascript)
function daysInMonth(year, month) {
	return new Date(parseInt(year), parseInt(month) + 1, 0).getDate();
};


// IS LAST DAY OF MONTH: Determine whether a particular day represents the last day of a given month (thanks to Gemini for this one) - remember the month in JS is zero-indexed
function isLastDayOfMonth(year, month, day) {
	const nextDay = new Date(year, month, day + 1); // Create date object for the next day
	return nextDay.getDate() === 1; // Check if the next day is the 1st of the next month
};


// IS DATE BEFORE RANGE: Determine if a particular day is before the project began
function isDateBeforeRange(year, month, day) {
	// JavaScript Date months are 0-indexed (0 for Jan, 11 for Dec),
	const viewedDate = new Date(year, month - 1, day);
	const startBoundary = new Date(2021, 6, 1);
	return viewedDate < startBoundary;
};


// IS DATE AFTER RANGE: Determine if a particular day is after the project ends (and data is no longer being collected)
function isDateAfterRange(year, month, day) {
	// JavaScript Date months are 0-indexed (0 for Jan, 11 for Dec),
	const viewedDate = new Date(year, month - 1, day);
	const endBoundary = new Date(2026, 5, 30);
	return viewedDate > endBoundary;
};


// UPDATE DATE PICKER VALUE: Make sure date picker reflects current date (if it is day view)
function updateDatePickerValue() {
	// Only update if currentYear, currentMonth, and currentDay are not null (i.e., not in 'total' view initially)
	if (currentYear !== null && currentMonth !== null && currentDay !== null) {
		// Ensure month and day have leading zeros if they are single digits
		const formattedMonth = String(currentMonth).padStart(2, '0');
		const formattedDay = String(currentDay).padStart(2, '0');
		// Construct the date string in 'YYYY-MM-DD' format
		const dateString = `${currentYear}-${formattedMonth}-${formattedDay}`;
		datePicker.value = dateString;
	} else {
		datePicker.value = '';
	}
};


// CHECK IF FILE EXISTS: Function to see if file exists when attempting to load JSON data
async function checkIfFileExists(filePath) {
	try {
		const response = await fetch(filePath, {
			method: 'HEAD' // Use the HEAD method for efficiency
		});
		// response.ok is true for HTTP status codes in the 200-299 range which means the file was found successfully
		return response.ok;
	} catch (error) {
		// This catch block will handle network errors (e.g., server unreachable, no internet connection, CORS issues if the file is on a different domain without proper headers)
		console.error(`Network or CORS error when checking for ${filePath}:`, error);
		return false; // Assume file doesn't exist or is inaccessible due to error
	}
};


// SHOW/HIDE CHART MESSAGE: Functions to give user a friendly error message, and offer an "OK" button to dismiss it
function showChartMessage(message) {
	messageTextElement.textContent = message;
	chartMessageOverlay.classList.add('show');
	// Optionally, focus the button for accessibility
	messageOkBtn.focus();
};
function hideChartMessage() {
	chartMessageOverlay.classList.remove('show');
};


// GET CHART TOTAL SUM: This function calculates the total net sum of all 'y' values from visible datasets for the purposes of generating the GHG equivalents section of the interface
function getChartTotalSum(chartInstance) {
	if (!chartInstance || !chartInstance.data || !chartInstance.data.datasets) {
		console.warn("Invalid Chart.js instance provided.");
		return 0;
	}
	let totalSum = 0;
	chartInstance.data.datasets.forEach(dataset => {
		// Only sum data from datasets that are not hidden
		if (!dataset.hidden) {
			dataset.data.forEach(dataPoint => {
				// Assuming dataPoint is { x: ..., y: value }
				// Ensure 'y' is treated as a number
				if (typeof dataPoint.y === 'number') {
					totalSum += dataPoint.y;
				} else if (typeof dataPoint === 'number') {
					// Handle cases where data might be just an array of numbers [val1, val2, ...]
					totalSum += dataPoint;
				}
			});
		}
	});
	return totalSum;
};


// GHG EQUIVALENT: Function to render GHG emissions in tCO2e in more tangible and less abstract terms that people can relate to
function ghgEquivalent(currentTotal) {
	// The below factors are used for each project activity chart, in the generating of impact equivalencies for better comprehension of GHG mitigation benefits.
	// *Source: United States EPA. (October 15, 2018). Greenhouse Gas Equivalencies Calculator. Retrieved on October 19, 2021 from https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator.	
	const carUnitFactor = 0.000398;
	const carConvFactor = 1.609; // Imperial to Metric conversion factor
	const gasUnitFactor = 0.008887;
	const gasConvFactor = 3.78541; // Imperial to Metric conversion factor
	const phoneUnitFactor = 0.00000822;
	const trashUnitFactor = 0.0235;
	const ledUnitFactor = 0.0264;
	const treeUnitFactor = 0.06;
	// Determine the GHG equivalent based on the type of activity
	ghgEquivTotal.innerHTML = `<data value="${currentTotal}">${currentTotal.toFixed(5)}</data> tCO<sub>2</sub>e`;
	// Car
	let carEquivalent = (currentTotal / carUnitFactor) * carConvFactor;
	ghgEquivCar.innerHTML = `<data value="${carEquivalent.toFixed(1)}">${carEquivalent.toFixed(1).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} km</data> not driven by an average passenger vehicle`;
	// Gas
	let gasEquivalent = (currentTotal / gasUnitFactor) * gasConvFactor;
	ghgEquivGas.innerHTML = `<data value="${gasEquivalent.toFixed(1)}">${gasEquivalent.toFixed(1).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} L</data> of gasoline not consumed`;
	// Phone
	let phoneEquivalent = currentTotal / phoneUnitFactor;
	ghgEquivPhone.innerHTML = `<data value="${phoneEquivalent.toFixed(1)}">${phoneEquivalent.toFixed(1).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</data> complete daily phone charge cycles avoided`;
	// Trash
	let trashEquivalent = currentTotal / trashUnitFactor;
	ghgEquivTrash.innerHTML = `<data value="${trashEquivalent.toFixed(1)}">${trashEquivalent.toFixed(1).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</data> trash bags of waste recycled instead of landfilled`;
	// LED
	let ledEquivalent = currentTotal / ledUnitFactor;
	ghgEquivLed.innerHTML = `<data value="${ledEquivalent.toFixed(1)}">${ledEquivalent.toFixed(1).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</data> incandescent lamps switched to LEDs for one year`;
	// Tree
	let treeEquivalent = currentTotal / treeUnitFactor;
	ghgEquivTree.innerHTML = `<data value="${treeEquivalent.toFixed(1)}">${treeEquivalent.toFixed(1).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</data> tree seedlings grown for 10 years`;
};