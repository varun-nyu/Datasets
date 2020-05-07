let selectedCountry;
const getLineChartScales = config => {
  const chartDimensions = getChartHeightAndWidth(config.dimensions);
  const yScale = d3
    .scaleLinear()
    .domain(
      d3.extent(donationData.map(d => d.donated_amount - d.received_amount))
    )
    .range([chartDimensions.height, 0]);

  const xScale = d3
    .scaleTime()
    .domain(d3.extent(selectedCountry.map(d => d.year)))
    .range([0, chartDimensions.width]);

  const values = donationData.map(d => d.donated_amount - d.received_amount);

  const colorScale = d3
    .scaleLinear()
    .domain([d3.min(values), 0, d3.max(values)])
    .range(d3.schemePiYG[3]);

  return { xScale, yScale, colorScale };
};
const getLineChartConfig = () => {
  const dimensions = {
    width: 500,
    height: 500,
    margin: {
      top: 50,
      bottom: -10,
      left: 100,
      right: -10
    }
  };

  const svg = d3.select("#ReceivedDonationLine");
  svg
    .attr(
      "width",
      dimensions.width + dimensions.margin.left + dimensions.margin.right
    )
    .attr(
      "height",
      dimensions.height + dimensions.margin.top + dimensions.margin.bottom
    )
    .style(
      "transform",
      `translate(${dimensions.margin.left}, ${dimensions.margin.top})`
    );

  return {
    container: svg,
    dimensions
  };
};

const drawLineChartAxes = (config, scales) => {
  const { xScale, yScale } = scales;
  const { container, dimensions } = config;
  const chartDimensions = getChartHeightAndWidth(config.dimensions);

  const xAxis = d3.axisBottom(xScale).tickFormat(d => d.getFullYear());

  container
    .append("g")
    .attr(
      "transform",
      `translate(${config.dimensions.margin.left}, ${chartDimensions.height})`
    )
    .call(xAxis)
    .selectAll("text")
    .attr("transform", `translate(-15, 10) rotate(-45)`);

  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat(d => `${Math.floor(d / Math.pow(10, 6))}B`);

  container
    .append("g")
    .attr("transform", `translate(${config.dimensions.margin.left})`)
    .call(yAxis);
};

const addToolTipToLineChart = (config, scales) => {
  const { container } = config;
  const chartDimensions = getChartHeightAndWidth(config.dimensions);
  const { xScale, yScale, colorScale } = scales;

  const bisectDate = d3.bisector(function(d) {
    return d.year;
  }).left;
  const dateFormatter = d3.timeFormat("%Y");
  const formatValue = d3.format(",");
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "lineTooltip")
    .style("display", "none");

  const focus = container
    .append("g")
    .attr("class", "focus")
    .style("display", "none");

  focus.append("circle").attr("r", 5);

  const tooltipDate = tooltip.append("div").attr("class", "lineTooltip-date");

  const tooltipText = tooltip.append("div");
  tooltipText
    .append("span")
    .attr("class", "tooltip-title")
    .text("Donated-Received: ");

  const tooltipTextValue = tooltipText
    .append("span")
    .attr("class", "lineTooltip-likes");

  container
    .append("rect")
    .attr("class", "overlay")
    .attr("width", chartDimensions.width)
    .attr("height", chartDimensions.height)
    .attr("transform", `translate(${config.dimensions.margin.left}, 0)`)
    .on("mouseover", () => {
      focus.style("display", null);
      tooltip.style("display", null);
    })
    .on("mouseout", () => {
      focus.style("display", "none");
      tooltip.style("display", "none");
    })
    .on("mousemove", () => {
      const x0 = xScale.invert(
          d3.mouse(container.node())[0] - config.dimensions.margin.left
        ),
        i = bisectDate(selectedCountry, x0, 1),
        d0 = selectedCountry[i - 1],
        d1 = selectedCountry[i],
        d = x0 - d0.year > d1.year - x0 ? d1 : d0;
      focus.attr(
        "transform",
        `translate(${xScale(d.year) + config.dimensions.margin.left},${yScale(
          d.donated_amount - d.received_amount
        )})`
      );
      tooltip.attr(
        "style",
        `left:${xScale(d.year) +
          config.dimensions.width +
          3 * config.dimensions.margin.left}px; top:${yScale(
          d.donated_amount - d.received_amount
        ) + config.dimensions.margin.top}px;`
      );

      tooltip.select(".lineTooltip-date").text(dateFormatter(d.year));

      tooltip
        .select(".lineTooltip-likes")
        .text(formatValue(d.donated_amount - d.received_amount));
    });
};

const drawLineChartForCountry = (config, scales) => {
  const { xScale, yScale, colorScale } = scales;
  const { container, dimensions } = config;
  const chartDimensions = getChartHeightAndWidth(config.dimensions);
  const minColorVal = colorScale(
    d3.min(selectedCountry.map(d => d.donated_amount - d.received_amount))
  );
  const maxColorVal = colorScale(
    d3.max(selectedCountry.map(d => d.donated_amount - d.received_amount))
  );

  container
    .append("linearGradient")
    .attr("id", "donationGradient")
    .attr("gradientUnits", "userSpaceOnUse")
    .attr("x1", 0)
    .attr("y1", dimensions.margin.top)
    .attr("x2", 0)
    .attr("y2", dimensions.height - dimensions.margin.bottom)
    .selectAll("stop")
    .data(
      selectedCountry.map((country, idx) => {
        let colorVal = "";
        if (country.donated_amount - country.received_amount < 0) {
          colorVal = minColorVal;
        } else if (country.donated_amount - country.received_amount > 0) {
          colorVal = maxColorVal;
        } else {
          colorVal = colorScale(0);
        }
        return {
          offset: (idx + 1) / selectedCountry.length,
          color: colorVal
        };
      })
    )
    .join("stop")
    .attr("offset", d => d.offset)
    .attr("stop-color", d => d.color);

  container
    .append("path")
    .datum(selectedCountry)
    .attr(
      "d",
      d3
        .line()
        .x(d => {
          return xScale(d.year);
        })
        .y(d => {
          return yScale(d.donated_amount - d.received_amount);
        })
    )
    .attr("fill", "none")
    .attr("stroke-width", 1.8)
    .attr("stroke", "Magenta")
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round")
    .attr("transform", `translate(${dimensions.margin.left})`);

  container
    .datum(selectedCountry)
    .append("path")
    .attr(
      "d",
      d3
        .line()
        .x(d => xScale(d.year))
        .y(d => yScale(0))
    )
    .attr("fill", "none")
    .attr("stroke-width", 1.9)
    .attr("stroke-dasharray", "4")
    .attr("stroke", "LightSeaGreen")
    .attr("transform", `translate(${dimensions.margin.left})`);
};

const addLineChartLabels = config => {
  const { container, dimensions } = config;

  container
    .append("text")
    .attr("text-anchor", "middle")
    .attr(
      "transform",
      `translate(${dimensions.width / 2 + 20}, ${dimensions.height + 20})`
    )
    .text("Year");

  container
    .append("text")
    .attr("text-anchor", "middle")
    .attr("transform", `translate(50, 250) rotate(-90)`)
    .text("Recieved & Donated Amount in USD Billions");
};

const showCountryOnChart = (config, country) => {
    const {container, dimensions} = config;
    container
    .append("text")
    .attr("x", (dimensions.width) - 100)
    .attr("y", 20)
    .text(country)
    .attr("class", "country-text")
};

const clearLineChart = () => {
  d3.selectAll("#ReceivedDonationLine > *").remove();
};

const renderLineChartForCountry = country => {
  selectedCountry = donationData
    .filter(d => d.country === country)
    .sort((first, second) => {
      return parseInt(first.year) - parseInt(second.year);
    })
    .map(d => {
      return {
        ...d,
        year: new Date(parseInt(d.year), 10)
      };
    });
  clearLineChart();
  const lineChartConfig = getLineChartConfig();
  const lineScales = getLineChartScales(lineChartConfig);
  drawLineChartAxes(lineChartConfig, lineScales);
  drawLineChartForCountry(lineChartConfig, lineScales);
  addToolTipToLineChart(lineChartConfig, lineScales);
  addLineChartLabels(lineChartConfig);
  showCountryOnChart(lineChartConfig,country);
};
