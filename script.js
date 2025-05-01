// Loading in the data.
  d3.csv("data.csv").then(data => {
    // We first start with the interactive bar chart.
    const svg = d3.select("#barChart");
    const width = +svg.attr("width") - 100;
    const height = +svg.attr("height") - 100;
    const margin = { top: 40, right: 30, bottom: 70, left: 60 };
    const chartArea = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Only want data from after 1983 and before 2012 because there isn't as much data in this set for the years before that and after that.
    data = data.filter(d => d.Year <= 2012);
    data = data.filter(d => d.Year >= 1983);
    //Convert sales data into numbers
    data.forEach(d => {
      d.Year = +d.Year;
      d.NA_Sales = +d.NA_Sales;
      d.EU_Sales = +d.EU_Sales;
      d.JP_Sales = +d.JP_Sales;
      d.Global_Sales = +d.Global_Sales;
      d.Other_Sales = +d.Other_Sales;
    });

    // Create a set of the available years
    const years = Array.from(new Set(data.map(d => d.Year))).sort();
    const yearSelect = d3.select("#year");
    years.forEach(y => {
      yearSelect.append("option").attr("value", y).text(y);
    });

    // Just an arbitrary default value that the visualization starts with
    let selectedYear = years[0];
    let selectedRegion = "NA_Sales";

    // If a different year is selected all charts will be updated.
    yearSelect.on("change", () => {
      selectedYear = +yearSelect.property("value");
      updateCharts();
    });
    // If a different region is selected only the bar chart needs updating.
    d3.select("#region").on("change", () => {
      selectedRegion = d3.select("#region").property("value");
      updateBarChart();
    });

    //updates all charts (function is following the pattern of the one shown in the in class example)
    function updateCharts() {
        updateBarChart();
        updatePieChart(); 
        updateLineChart();
    }

    //Function for barchart visualization.
    function updateBarChart() {
        // When presenting the bar chart we are only dealing with the selected year
        const filtered = data.filter(d => d.Year === selectedYear);

        // Sum sales by genre and using rollups to store this information in a way that will be easy to make into a barchart.
        const salesByGenre = d3.rollups(
        filtered,
        v => d3.sum(v, d => d[selectedRegion]),
        d => d.Genre
        ).map(([genre, sales]) => ({ genre, sales }));

        // Sorts the data in descending order.
        salesByGenre.sort((a, b) => b.sales - a.sales);

        // Scales for bar chart
        const x = d3.scaleBand()
        .domain(salesByGenre.map(d => d.genre))
        .range([0, width])
        .padding(0.3);

        const y = d3.scaleLinear()
        .domain([0, d3.max(salesByGenre, d => d.sales)])
        .range([height, 0]);

        chartArea.selectAll("*").remove();

        // Edits apperance of the axes
        chartArea.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("text-anchor", "middle");
        chartArea.append("g")
        .call(d3.axisLeft(y));

        chartArea.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -50)
        .attr("x", -height / 2)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("fill", "white")
        .text("Sales (in millions)");

        // defines the bars in the bar chart.
        chartArea.selectAll(".rect")
        .data(salesByGenre, d => d.genre)
        .join(
        enter => enter.append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.genre))
            .attr("width", x.bandwidth())
            .attr("y", d => y(0))
            .attr("height", 0)
            .attr("fill", "steelblue")
            .transition()
            .duration(500)
            .attr("y", d => y(d.sales))
            .attr("height", d => height - y(d.sales)),
    
        update => update
            .transition()
            .duration(500)
            .attr("x", d => x(d.genre))
            .attr("width", x.bandwidth())
            .attr("y", d => y(d.sales))
            .attr("height", d => height - y(d.sales)),
    
        exit => exit.remove()
        );
    }
    //Function for pie chart visualization.
    function updatePieChart() {
        //Just like before we only want to look at data over the selected year.
        const filtered = data.filter(d => d.Year === selectedYear);

        // Sum the sales by region and maps them properly to be made into a pie chart.
        const regionSales = {
            "North America": d3.sum(filtered, d => d.NA_Sales),
            "Europe": d3.sum(filtered, d => d.EU_Sales),
            "Japan": d3.sum(filtered, d => d.JP_Sales),
            "Other": d3.sum(filtered, d => d.Other_Sales)
        };
        // Goes through region sales and correlates the sales for region into data for the pie chart.
        const pieData = Object.keys(regionSales).map(region => ({
            region: region,
            sales: regionSales[region]
        }));

        //Grabs the pieChart SVG and groups them. Also adds important attributes like width, height, and radius.
        const pieSvg = d3.select("#pieChart");
        const pieWidth = +pieSvg.attr("width");
        const pieHeight = +pieSvg.attr("height");
        const pieRadius = Math.min(pieWidth, pieHeight) / 2;

        pieSvg.selectAll("*").remove();

        const pieChartArea = pieSvg.append("g")
            .attr("transform", `translate(${pieWidth / 2 + 60},${pieHeight / 2})`);
        //Used same color scheme as in other Assignments.
        const color = d3.scaleOrdinal(d3.schemeCategory10);
        //Defines the pie chat with the appropriate values
        const pie = d3.pie()
            .value(d => d.sales)
            .sort(null);

        const arc = d3.arc()
            .outerRadius(pieRadius - 10)
            .innerRadius(0);

        const arcs = pieChartArea.selectAll(".arc")
            .data(pie(pieData))
            .enter().append("g")
            .attr("class", "arc");

        // Puts a label for the container below the chart
        let infoText = pieSvg.select("#infoText");
        if (infoText.empty()) {
            infoText = pieSvg.append("text")
                .attr("id", "infoText")
                .attr("x", pieWidth / 2 + 60)
                .attr("y", pieHeight + 10)
                .attr("text-anchor", "middle")
                .style("fill", "white")
                .style("font-size", "14px");
        }
        // On click the label for the container can appear giving more information about the pie chart. Addded for readability.
        arcs.append("path")
            .attr("d", arc)
            .attr("fill", d => color(d.data.region))
            .on("click", function (event, d) {
                const total = d3.sum(pieData, d => d.sales);
                const percent = ((d.data.sales / total) * 100).toFixed(2);
                infoText.text(`${d.data.region}: ${percent}% of total sales`);
            });

        // Making a legend for the pie chart in a similar manner as was done in prior assignments.
        const legend = pieSvg.append("g")
            .attr("transform", `translate(20, ${pieHeight / 2 - pieData.length * 10})`);

        const legendItems = legend.selectAll(".legend")
            .data(pieData)
            .enter().append("g")
            .attr("class", "legend")
            .attr("transform", (d, i) => `translate(0, ${i * 20})`);

        legendItems.append("rect")
            .attr("x", 0)
            .attr("width", 18)
            .attr("height", 18)
            .attr("fill", d => color(d.region));

        legendItems.append("text")
            .attr("x", 25)
            .attr("y", 9)
            .attr("dy", ".35em")
            .style("fill", "white")
            .text(d => d.region);
    }

    //Function for line chart visualization.
    function updateLineChart() {
        //groups things into linechart svg and adds the required attributes.
        const lineSvg = d3.select("#lineChart");
        const width = +lineSvg.attr("width") - 100;
        const height = +lineSvg.attr("height") - 60;
        const margin = { top: 40, right: 80, bottom: 50, left: 60 };
    
        lineSvg.selectAll("*").remove();

        const chartArea = lineSvg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // allYears will be used to set up the x axis for the line chart.
        const allYears = Array.from(new Set(data.map(d => d.Year))).sort((a, b) => a - b);
    
        const regions = ["NA_Sales", "EU_Sales", "JP_Sales", "Other_Sales"];
        const regionNames = {
            "NA_Sales": "North America",
            "EU_Sales": "Europe",
            "JP_Sales": "Japan",
            "Other_Sales": "Other"
        };
        //Create the structure that have sales for a specific year based on region to then graph.
        const salesByRegion = regions.map(region => ({
            region: regionNames[region],
            values: allYears.map(year => ({
                year: year,
                sales: d3.sum(data.filter(d => d.Year === year), d => d[region])
            }))
        }));

        //Standard deal to make line chart.
        const x = d3.scaleLinear()
            .domain(d3.extent(allYears))
            .range([0, width]);
    
        const y = d3.scaleLinear()
            .domain([0, d3.max(salesByRegion, r => d3.max(r.values, d => d.sales))])
            .nice()
            .range([height, 0]);
    
        const color = d3.scaleOrdinal()
            .domain(regions.map(r => regionNames[r]))
            .range(d3.schemeCategory10);
    
        const xAxis = d3.axisBottom(x).tickFormat(d3.format("d"));
        const yAxis = d3.axisLeft(y);
    
        chartArea.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(xAxis)
    
        chartArea.append("g").call(yAxis);
    
        chartArea.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -50)
            .attr("x", -height / 2)
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .style("fill", "white")
            .text("Sales (in millions)");
    
        const line = d3.line()
            .x(d => x(d.year))
            .y(d => y(d.sales));
    
        const lines = chartArea.selectAll(".line")
            .data(salesByRegion)
            .enter()
            .append("g");
    
        lines.append("path")
            .attr("class", "line")
            .attr("fill", "none")
            .attr("stroke", d => color(d.region))
            .attr("stroke-width", 2)
            .attr("d", d => line(d.values));
    
        // Legend for line graph.
        const legend = lineSvg.append("g")
            .attr("transform", `translate(${width + margin.left + 10}, ${margin.top})`);
    
        salesByRegion.forEach((d, i) => {
            const g = legend.append("g")
                .attr("transform", `translate(0, ${i * 20})`);
    
            g.append("rect")
                .attr("width", 10)
                .attr("height", 10)
                .attr("fill", color(d.region));
    
            g.append("text")
                .attr("x", 20)
                .attr("y", 12)
                .style("fill", "white")
                .text(d.region);
        });
    }

    updateCharts(); // Initial draw
});
