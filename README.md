# SPEEDIER GHG ACCOUNTING AND REPORTING DASHBOARD
This application allows visitors to view the GHG emission reductions made possible by each of the 
Distributed Energy Resources (DER) that comprise the SPEEDIER smart grid system, in isolation or 
in aggregate.

The dashboard is powered by the amazing Chart.js (https://www.chartjs.org/), which fetches the data 
from a collection of yearly and monthly JSON files:

## JSON files with hourly data for each month
- files are named in the format GHGIS-YYYY-MM.json
- powers month and day views

## JSON files with monthly data for each year
- files are named in the format GHGIS-YYYY.json
- powers year views

## JSON file for all time
- GHGIS-total.json
- Powers total view

The dashboard also renders an information panel that reports the GHG emission reductions in everyday 
equivalent terms so that the lay person can appreciate what the data - described in tonnes of CO2 
equivalent - actually mean.

Thanks to the great team at Lakeland Solutions, Georgian College Research and Innovation, Georgian 
College Computer Studies, students from the Georgian College Research Analyst and the Big Data 
programs, Natural Resources Canada, the Township of Parry Sound, the GHG Management Institute, and 
many others who helped to make this visualization tool a reality.