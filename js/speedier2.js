/* CONSTANTS AND VARIABLES
---------------------------------------------------------------------------------------------------- */

// Configuration constants
const config = {
    dataPath: "data/",
    initialJsonFileName: "GHGIS-total.json",
    // Define the valid date range for navigation
    minDate: new Date(2021, 6, 1), // July 1, 2021 (Month is 0-indexed)
    maxDate: new Date(2026, 5, 30) // June 30, 2026
};

// Global variables for chart and state management
let myChart;
let currentView = "total"; // total | year | month | day
let currentDate = null; // Stores a Date object representing the current year/month/day
let datasetVisibility = new Map(); // Stores { "AssetLabel": boolean (true for hidden, false for visible) }

// Cache DOM elements
const dom = {
    prevBtn: document.getElementById('prev'),
    prevNextLabel: document.getElementById('prevNextLabel'),
    nextBtn: document.getElementById('next'),
    diagnostics: document.getElementById('diagnostics'),
    datePicker: document.getElementById("date"),
    dayBtn: document.getElementById('day'),
    monthBtn: document.getElementById('month'),
    yearBtn: document.getElementById('year'),
    totalBtn: document.getElementById('total'),
    myChartCanvas: document.getElementById('myChart')
};


/* EVENT LISTENERS
---------------------------------------------------------------------------------------------------- */

dom.datePicker.addEventListener("change", () => {
    const selectedDateString = dom.datePicker.value;
    if (selectedDateString) {
        // Parse the date string into a Date object
        const [year, month, day] = selectedDateString.split('-').map(Number);
        currentDate = new Date(year, month - 1, day); // Month is 0-indexed for Date object

        // Always show day view when date picker is used to select a specific date
        showDay(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
    } else {
        console.warn("No date selected or invalid date.");
    }
});

dom.dayBtn.addEventListener('click', () => {
    // If not already in day view, default to the last set date or a logical default
    if (!currentDate) {
        currentDate = new Date(); // Use current system date as a fallback
    }
    showDay(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
});

dom.monthBtn.addEventListener('click', () => {
    // If not already in month view, default to the last set date or a logical default
    if (!currentDate) {
        currentDate = new Date();
    }
    showMonth(currentDate.getFullYear(), currentDate.getMonth() + 1);
});

dom.yearBtn.addEventListener('click', () => {
    // If not already in year view, default to the last set date or a logical default
    if (!currentDate) {
        currentDate = new Date();
    }
    showYear(currentDate.getFullYear());
});

dom.totalBtn.addEventListener('click', showTotal);

dom.prevBtn.addEventListener("click", updatePrev);
dom.nextBtn.addEventListener("click", updateNext);

// Initialize the chart on page load
initializeChart();


/* PRIMARY FUNCTIONS
---------------------------------------------------------------------------------------------------- */

/**
 * Initializes the Chart.js instance. This runs once on page load.
 */
function initializeChart() {
    const ctx = dom.myChartCanvas.getContext('2d');
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [], // Will be populated dynamically
            datasets: [] // Will be populated dynamically
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    // Default type for total view, will be overridden by showYear/Month/Day
                    type: 'category',
                    title: { display: true, text: '' } // Text will be set by view functions
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
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
                        const chart = legend.chart;
                        chart.data.datasets[index].hidden = !chart.data.datasets[index].hidden;
                        datasetVisibility.set(legendItem.text, chart.data.datasets[index].hidden);
                        chart.update();
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
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        // These will be overridden by view-specific callbacks
                        title: function(context) { return context[0].label; },
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) { label += ': '; }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                }).format(context.parsed.y) + ' tonnes CO2e';
                            }
                            return label;
                        }
                    }
                },
                datalabels: { // Ensure datalabels plugin is configured
                    display: true,
                    align: 'center',
                    anchor: 'center',
                    color: '#fff',
                    formatter: function(value, context) {
                        return new Intl.NumberFormat('en-US', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                        }).format(value);
                    }
                },
                title: { display: true, text: '' } // Title will be set by view functions
            },
            onClick: handleChartClick,
            onHover: handleChartHover
        },
        plugins: [ChartDataLabels] // Global plugins are registered here
    });

    // Load initial data for the total view
    showTotal();
}

/**
 * Fetches JSON data from the specified path.
 * @param {string} fileName - The name of the JSON file to fetch.
 * @returns {Promise<Object>} - A promise that resolves with the JSON data.
 */
async function fetchData(fileName) {
    try {
        const response = await fetch(`${config.dataPath}${fileName}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching data for ${fileName}:`, error);
        throw error; // Re-throw to be caught by the calling function
    }
}

/**
 * Applies stored dataset visibility to the chart.
 * @param {Chart} chart - The Chart.js instance.
 */
function applyDatasetVisibility(chart) {
    chart.data.datasets.forEach(dataset => {
        if (datasetVisibility.has(dataset.label)) {
            dataset.hidden = datasetVisibility.get(dataset.label);
        } else {
            dataset.hidden = false; // Default to visible if no state stored
        }
    });
}

/**
 * Updates the chart with new data and options.
 * This is a centralized function to avoid repetitive code in view functions.
 * @param {Object} data - The new data object for Chart.js.
 * @param {Object} options - Specific options for the current view.
 * @param {string} viewName - The name of the current view ('total', 'year', 'month', 'day').
 */
function updateChart(data, options, viewName) {
    myChart.data = data; // Assign new data
    Object.assign(myChart.options, options); // Merge new options

    applyDatasetVisibility(myChart); // Re-apply visibility states

    myChart.update(); // Redraw chart

    currentView = viewName;
    updateUI(); // Update UI elements after chart redraw
}

/**
 * Shows the total GHG emissions data.
 */
async function showTotal() {
    try {
        const data = await fetchData(config.initialJsonFileName);
        currentDate = null; // Reset date for total view

        const options = {
            scales: {
                x: {
                    type: 'category',
                    title: { display: true, text: 'Year' },
                    ticks: {
                        autoSkip: false,
                        maxRotation: 0,
                        minRotation: 0,
                        callback: function(val, index) { return this.getLabelForValue(val); }
                    }
                }
            },
            plugins: {
                title: { text: 'Total Annual GHG Emissions Avoided' },
                tooltip: {
                    callbacks: {
                        title: function(context) { return `Year: ${context[0].label}`; },
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) { label += ': '; }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                }).format(context.parsed.y) + ' tonnes CO2e';
                            }
                            return label;
                        }
                    }
                }
            }
        };
        updateChart(data, options, "total");

    } catch (error) {
        alert("Could not load total data. Please try again later.");
    }
}

/**
 * Shows GHG emissions data for a specific year, month-by-month.
 * @param {number} year - The year to display.
 */
async function showYear(year) {
    try {
        const fileName = `GHGIS-${year}.json`;
        const data = await fetchData(fileName);
        currentDate = new Date(year, 0, 1); // Set current date to start of the year

        const options = {
            scales: {
                x: {
                    type: 'category',
                    title: { display: true, text: 'Month' },
                    ticks: {
                        autoSkip: false,
                        maxRotation: 45,
                        minRotation: 0,
                        callback: function(val, index) {
                            const dateString = this.getLabelForValue(val); // e.g., "2024-01"
                            const [y, m] = dateString.split('-').map(Number);
                            return new Date(y, m - 1).toLocaleString('en-US', { month: 'short' });
                        }
                    }
                }
            },
            plugins: {
                title: { text: `Monthly GHG Emissions Avoided for ${year}` },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            const dateString = context[0].label; // e.g., "2024-01"
                            const [y, m] = dateString.split('-').map(Number);
                            return new Date(y, m - 1).toLocaleString('en-US', { year: 'numeric', month: 'long' });
                        },
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) { label += ': '; }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                }).format(context.parsed.y) + ' tonnes CO2e';
                            }
                            return label;
                        }
                    }
                }
            }
        };
        updateChart(data, options, "year");

    } catch (error) {
        alert(`No data available for the YEAR: ${year}`);
        // If fetch fails (e.g., no data for future year), roll back the year
        if (currentDate) {
            currentDate.setFullYear(currentDate.getFullYear() - 1);
        } else {
            currentDate = new Date(new Date().getFullYear() - 1, 0, 1); // Fallback if currentDate was null
        }
    }
}

/**
 * Shows GHG emissions data for a specific month, day-by-day.
 * @param {number} year - The year.
 * @param {number} month - The month (1-indexed).
 */
async function showMonth(year, month) {
    try {
        const monthPadded = String(month).padStart(2, '0');
        const fileName = `GHGIS-${year}-${monthPadded}.json`;
        const fetchedData = await fetchData(fileName);

        // Process the fetched data to sum values for each day
        const processedLabels = [];
        const processedDatasets = fetchedData.datasets.map(dataset => {
            const dailySums = new Map(); // Map to store sums for each day

            // Iterate through all hourly data points to sum up for each day
            dataset.data.forEach(item => {
                const dayKey = item.x.substring(0, 10); // "YYYY-MM-DD"
                dailySums.set(dayKey, (dailySums.get(dayKey) || 0) + item.y);
            });

            // Ensure labels are in order and cover all days in the month
            const daysInCurrentMonth = new Date(year, month, 0).getDate();
            const monthlyDataPoints = [];

            for (let d = 1; d <= daysInCurrentMonth; d++) {
                const dayPadded = String(d).padStart(2, '0');
                const fullDateKey = `${year}-${monthPadded}-${dayPadded}`;
                monthlyDataPoints.push({ x: fullDateKey, y: dailySums.get(fullDateKey) || 0 });
                if (!processedLabels.includes(fullDateKey)) {
                    processedLabels.push(fullDateKey);
                }
            }
            // Sort labels to ensure correct order
            processedLabels.sort();


            return {
                label: dataset.label,
                data: monthlyDataPoints,
                backgroundColor: dataset.backgroundColor
            };
        });

        currentDate = new Date(year, month - 1, 1); // Set current date to start of the month

        const options = {
            scales: {
                x: {
                    type: 'category',
                    title: { display: true, text: 'Day' },
                    ticks: {
                        autoSkip: false,
                        maxRotation: 45,
                        minRotation: 0,
                        callback: function(val, index) {
                            const dateString = this.getLabelForValue(val); // e.g., "2024-01-15"
                            const d = new Date(dateString);
                            return d.toLocaleString('en-US', { day: 'numeric' });
                        }
                    }
                }
            },
            plugins: {
                title: { text: `Daily GHG Emissions Avoided for ${new Date(year, month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })}` },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            const dateString = context[0].label; // e.g., "2024-01-15"
                            const d = new Date(dateString);
                            return d.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
                        }
                    }
                }
            }
        };

        // Combine labels and datasets for the updateChart function
        const chartData = {
            labels: processedLabels,
            datasets: processedDatasets
        };
        updateChart(chartData, options, "month");

    } catch (error) {
        alert(`No data available for the MONTH: ${year}-${month}.`);
        // Roll back the month if fetch fails
        if (currentDate) {
            currentDate.setMonth(currentDate.getMonth() - 1);
        } else {
            currentDate = new Date(); // Fallback
            currentDate.setMonth(currentDate.getMonth() - 1);
        }
    }
}

/**
 * Shows GHG emissions data for a specific day, hour-by-hour.
 * @param {number} year - The year.
 * @param {number} month - The month (1-indexed).
 * @param {number} day - The day.
 */
async function showDay(year, month, day) {
    try {
        const monthPadded = String(month).padStart(2, '0');
        const fileName = `GHGIS-${year}-${monthPadded}.json`;
        const fetchedData = await fetchData(fileName);

        const processedLabels = [];
        const processedDatasets = fetchedData.datasets.map(dataset => {
            const hourlyDataPoints = [];
            const dayString = `${year}-${monthPadded}-${String(day).padStart(2, '0')}`;

            for (let i = 0; i < 24; i++) {
                const hourPadded = String(i).padStart(2, '0');
                const fullHourLabel = `${dayString} ${hourPadded}:00:00`; // Matches JSON "YYYY-MM-DD HH:00:00"

                const dataPoint = dataset.data.find(item => item.x === fullHourLabel);
                hourlyDataPoints.push({ x: fullHourLabel, y: dataPoint ? dataPoint.y : 0 });

                if (!processedLabels.includes(fullHourLabel)) {
                    processedLabels.push(fullHourLabel);
                }
            }
            processedLabels.sort(); // Ensure labels are in correct order

            return {
                label: dataset.label,
                data: hourlyDataPoints,
                backgroundColor: dataset.backgroundColor
            };
        });
        currentDate = new Date(year, month - 1, day); // Set current date

        const options = {
            scales: {
                x: {
                    type: 'category',
                    title: { display: true, text: 'Hour of Day' },
                    ticks: {
                        autoSkip: false,
                        maxRotation: 45,
                        minRotation: 0,
                        callback: function(val, index) {
                            const dateString = this.getLabelForValue(val); // e.g., "2024-01-15 10:00:00"
                            const hourPart = dateString.substring(11, 13);
                            return `${hourPart}:00`;
                        }
                    }
                }
            },
            plugins: {
                title: { text: `Hourly GHG Emissions Avoided for ${currentDate.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}` },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            const dateString = context[0].label; // e.g., "2024-01-15 10:00:00"
                            const d = new Date(dateString);
                            return d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                        }
                    }
                }
            }
        };

        const chartData = {
            labels: processedLabels,
            datasets: processedDatasets
        };
        updateChart(chartData, options, "day");

    } catch (error) {
        alert(`No data available for the DAY: ${year}-${month}-${day}`);
        // Roll back the day if fetch fails
        if (currentDate) {
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            currentDate = new Date(); // Fallback
            currentDate.setDate(currentDate.getDate() - 1);
        }
    }
}


/* NAVIGATION AND UI UPDATE FUNCTIONS
---------------------------------------------------------------------------------------------------- */

/**
 * Handles clicks on chart bars for drilling down into data.
 * @param {Event} event - The click event.
 * @param {Array} elements - Array of clicked elements on the chart.
 */
function handleChartClick(event, elements) {
    if (elements.length === 0) return; // No bar was clicked

    const clickedLabel = myChart.data.labels[elements[0].index];

    switch (currentView) {
        case "total":
            const year = parseInt(clickedLabel);
            currentDate = new Date(year, 0, 1); // Set current date to clicked year
            showYear(year);
            break;
        case "year":
            // "2024-01" -> year=2024, month=1
            const [yearFromMonth, monthFromMonth] = clickedLabel.split('-').map(Number);
            currentDate = new Date(yearFromMonth, monthFromMonth - 1, 1); // Set current date to clicked month
            showMonth(yearFromMonth, monthFromMonth);
            break;
        case "month":
            // "2024-01-15" -> year=2024, month=1, day=15
            const [yearFromDay, monthFromDay, dayFromDay] = clickedLabel.split('-').map(Number);
            currentDate = new Date(yearFromDay, monthFromDay - 1, dayFromDay); // Set current date to clicked day
            showDay(yearFromDay, monthFromDay, dayFromDay);
            break;
        case "day":
            // Cannot drill down further
            break;
    }
}

/**
 * Handles hover events on chart bars to change cursor.
 * @param {Event} event - The hover event.
 * @param {Array} chartElement - Array of elements being hovered over.
 */
function handleChartHover(event, chartElement) {
    dom.myChartCanvas.style.cursor = (chartElement.length > 0 && currentView !== 'day') ? 'pointer' : 'default';
}

/**
 * Updates the UI elements based on the current view (buttons, labels, date picker).
 */
function updateUI() {
    // Update Prev/Next Label
    let labelText = '';
    if (currentView === "total") {
        labelText = "Total";
    } else if (currentDate) {
        // Use Intl.DateTimeFormat for better localization and flexibility
        if (currentView === "year") {
            labelText = new Intl.DateTimeFormat('en-US', { year: 'numeric' }).format(currentDate);
        } else if (currentView === "month") {
            labelText = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long' }).format(currentDate);
        } else if (currentView === "day") {
            labelText = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(currentDate);
        }
    }
    dom.prevNextLabel.textContent = labelText;

    // Update Date Picker Value
    if (currentDate && currentView !== 'total') {
        // Format Date object to YYYY-MM-DD for date picker
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        dom.datePicker.value = `${year}-${month}-${day}`;
    } else {
        dom.datePicker.value = ''; // Clear for total view or initial load
    }

    // Update Button States
    dom.totalBtn.disabled = false; // Always enabled once chart is loaded
    dom.yearBtn.disabled = (currentView === 'total');
    dom.monthBtn.disabled = (currentView === 'total' || currentView === 'year');
    dom.dayBtn.disabled = (currentView === 'total' || currentView === 'year' || currentView === 'month');

    // Update Prev/Next Button States
    dom.prevBtn.disabled = isAtBoundary('prev');
    dom.nextBtn.disabled = isAtBoundary('next');

    // Update Diagnostics
    dom.diagnostics.innerHTML = `<b>currentView:</b> ${currentView}, <b>currentDate:</b> ${currentDate ? currentDate.toISOString().split('T')[0] : 'null'}`;
}

/**
 * Handles navigation to the previous period based on the current view.
 */
function updatePrev() {
    if (!currentDate && currentView !== 'total') {
        // Fallback for unexpected state, set to a default navigable date
        currentDate = new Date(new Date().getFullYear(), 0, 1);
    }

    let tempDate = currentDate ? new Date(currentDate) : null; // Create a mutable copy

    switch (currentView) {
        case "total":
            // Not applicable, prev/next buttons are disabled
            break;
        case "year":
            if (tempDate) tempDate.setFullYear(tempDate.getFullYear() - 1);
            if (tempDate && tempDate < config.minDate) { // Check if going before the min year
                tempDate = new Date(config.minDate.getFullYear(), 0, 1); // Set to min year if trying to go before
                dom.prevBtn.disabled = true;
            }
            if (tempDate) showYear(tempDate.getFullYear());
            break;
        case "month":
            if (tempDate) tempDate.setMonth(tempDate.getMonth() - 1);
            if (tempDate && tempDate < config.minDate) { // Check if going before the min month
                tempDate = new Date(config.minDate.getFullYear(), config.minDate.getMonth(), 1);
                dom.prevBtn.disabled = true;
            }
            if (tempDate) showMonth(tempDate.getFullYear(), tempDate.getMonth() + 1);
            break;
        case "day":
            if (tempDate) tempDate.setDate(tempDate.getDate() - 1);
            if (tempDate && tempDate < config.minDate) { // Check if going before the min day
                tempDate = new Date(config.minDate); // Set to min day
                dom.prevBtn.disabled = true;
            }
            if (tempDate) showDay(tempDate.getFullYear(), tempDate.getMonth() + 1, tempDate.getDate());
            break;
    }
}

/**
 * Handles navigation to the next period based on the current view.
 */
function updateNext() {
    if (!currentDate && currentView !== 'total') {
        currentDate = new Date(); // Fallback for unexpected state
    }

    let tempDate = currentDate ? new Date(currentDate) : null;

    switch (currentView) {
        case "total":
            // Not applicable
            break;
        case "year":
            if (tempDate) tempDate.setFullYear(tempDate.getFullYear() + 1);
            if (tempDate && tempDate > config.maxDate) { // Check if going past max year
                tempDate = new Date(config.maxDate.getFullYear(), 0, 1);
                dom.nextBtn.disabled = true;
            }
            if (tempDate) showYear(tempDate.getFullYear());
            break;
        case "month":
            if (tempDate) tempDate.setMonth(tempDate.getMonth() + 1);
            if (tempDate && tempDate > config.maxDate) { // Check if going past max month
                tempDate = new Date(config.maxDate.getFullYear(), config.maxDate.getMonth(), 1);
                dom.nextBtn.disabled = true;
            }
            if (tempDate) showMonth(tempDate.getFullYear(), tempDate.getMonth() + 1);
            break;
        case "day":
            if (tempDate) tempDate.setDate(tempDate.getDate() + 1);
            if (tempDate && tempDate > config.maxDate) { // Check if going past max day
                tempDate = new Date(config.maxDate);
                dom.nextBtn.disabled = true;
            }
            if (tempDate) showDay(tempDate.getFullYear(), tempDate.getMonth() + 1, tempDate.getDate());
            break;
    }
}


/* UTILITY FUNCTIONS
---------------------------------------------------------------------------------------------------- */

/**
 * Checks if the current date view is at the min/max boundary for prev/next buttons.
 * @param {string} direction - 'prev' or 'next'.
 * @returns {boolean} - True if at boundary, false otherwise.
 */
function isAtBoundary(direction) {
    if (!currentDate || currentView === 'total') return true; // Prev/Next not applicable for total

    let tempDate = new Date(currentDate); // Use a copy

    if (direction === 'prev') {
        if (currentView === 'year') {
            tempDate.setFullYear(tempDate.getFullYear() - 1);
        } else if (currentView === 'month') {
            tempDate.setMonth(tempDate.getMonth() - 1);
        } else if (currentView === 'day') {
            tempDate.setDate(tempDate.getDate() - 1);
        }
        return tempDate < config.minDate;
    } else if (direction === 'next') {
        if (currentView === 'year') {
            tempDate.setFullYear(tempDate.getFullYear() + 1);
        } else if (currentView === 'month') {
            tempDate.setMonth(tempDate.getMonth() + 1);
        } else if (currentView === 'day') {
            tempDate.setDate(tempDate.getDate() + 1);
        }
        return tempDate > config.maxDate;
    }
    return false;
}