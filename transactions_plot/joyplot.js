const COLORS = {
  aqua: "#4BDBBA",
  purple100: "#9C50FF",
  chartLight: "#E0E0E0",
  chartMedium: "#808080",
  pixHighlight: "#2C806C"
};

const CHART_CONFIG = {
  widthRatio: 1,
  height: 800,
  margin: { top: 160, right: 40, bottom: 40, left: 130 },
  padding: 10,
  multiplier: 1.6,
  hoverCircleRadius: 4,
  mobileBreakpoint: 480,
  areaFillOpacity: 0.6,
  areaStrokeWidth: 2,
  labelOffset: 10,
  yAxisOffset: 5,
  hoverLineDashArray: "4",
  transitionDuration: 1200,
  tooltipFadeDuration: 200,
  tooltip: {
    width: 130,
    padding: "6px 10px",
    borderRadius: "4px",
    offsetX: 10,
    offsetY: 15,
    rightMargin: 20
  }
};

// Application state
let data;
let xScale, yGroupScale, yScale, densityScale, areaGenerator, xAxis, yAxis;
let orderedGroups, groupsWithOrder;
let maxValue, maxAreaHeight, currentMaxY, quarterData;
let hoverLine, hoverCircles, tooltipContainer, groupTooltips;
let currentVar = "transactions";

// DOM elements
const svg = d3.select("#joyplot");
const container = d3.select(".container");

// Chart dimensions
const width = window.innerWidth * CHART_CONFIG.widthRatio;
const height = CHART_CONFIG.height;
const margin = CHART_CONFIG.margin;

let boundedWidth = width - margin.left - margin.right;
let boundedHeight = height - margin.top - margin.bottom;

svg.attr("viewBox", `0 0 ${width} ${height}`)
  .attr("preserveAspectRatio", "xMidyMid meet");

const g = svg.append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

const parseDate = d3.timeParse("%Y-%m");

// Load and parse CSV data
d3.csv("transactions_joyplot.csv", (d) => ({
  group: d.payment_method,
  date: d.date,
  transactions: +d.transactions * 100,
  volume: +d.value * 100,
  orderTransaction: +d.order_transaction,
  orderVolume: +d.order_volume
})).then(loadedData => {
  data = loadedData;
  initChart();

  // Set up click outside handler for hiding hover elements
  const rect_overlay = d3.select(".overlay").node();

  document.addEventListener("click", function(e) {
    if (e.target !== rect_overlay) {
      hideVerticalHover();
    }
  });
})

/**
 * Initializes the joyplot/ridgeline chart
 */
function initChart() {
  groupsWithOrder = [...new Set(data.map(d => d.group))]
    .map(groupName => {
      const sampleRow = data.find(d => d.group === groupName);
      return {
        group: groupName,
        orderTransaction: sampleRow.orderTransaction,
        orderVolume: sampleRow.orderVolume
      };
    });

  orderedGroups = getOrderedGroups();

  // Configure X scale
  xScale = d3.scalePoint()
    .domain(data.map(d => d.date).sort())
    .range([0, boundedWidth]);

  /**
   * Returns Q1 tick values based on container width
   */
  function getResponsiveQ1Ticks() {
    const containerWidth = container.node().getBoundingClientRect().width;
    const q1Quarters = [...new Set(data.map((d) => d.date))]
      .sort()
      .filter((quarter) => quarter.endsWith("-Q1"));

    if (containerWidth < CHART_CONFIG.mobileBreakpoint) {
      return q1Quarters.filter((d, i) => i % 2 === 0);
    } else {
      return q1Quarters;
    }
  }

  xAxis = d3.axisBottom(xScale)
    .tickValues(getResponsiveQ1Ticks())
    .tickFormat(d => d.split('-')[0]);

  // Configure Y scales
  yGroupScale = d3.scaleBand()
    .domain(orderedGroups)
    .range([0, boundedHeight])
    .paddingInner(-0.5)  // Negative padding creates overlap for ridgeline effect

  const firstGroupName = orderedGroups[0];
  const firstGroupData = data.filter(d => d.group == firstGroupName);
  const firstGroupY = yGroupScale(firstGroupName);

  yScale = d3.scaleLinear()
    .domain([0, d3.max(firstGroupData, d => d[currentVar])])
    .range([yGroupScale.bandwidth() * CHART_CONFIG.multiplier, 0]);

  yAxis = d3.axisRight(yScale)
    .ticks(4);

  // Configure area generator
  maxValue = d3.max(data, d => d[currentVar]);

  densityScale = d3.scaleLinear()
    .domain([0, maxValue])
    .range([0, yGroupScale.bandwidth() * CHART_CONFIG.multiplier]);

  areaGenerator = d3.area()
    .x((d) => xScale(d.date))
    .y0((d) => yGroupScale(d.group) + yGroupScale.bandwidth())
    .y1((d) => yGroupScale(d.group) + yGroupScale.bandwidth() - densityScale(d[currentVar]))
    .curve(d3.curveBasis);

  // Draw X axis
  g.append("g")
    .attr("class", "axis xaxis")
    .attr("transform", `translate(0, ${boundedHeight + CHART_CONFIG.padding})`)
    .call(xAxis)
    .select(".domain").remove();

  g.selectAll(".xaxis .tick line")
    .style("stroke", COLORS.chartLight);

  g.selectAll(".xaxis .tick text")
    .style("fill", COLORS.chartMedium);

  // Draw Y axis
  g.append("g")
    .attr("class", "axis yaxis")
    .attr("transform", `translate(${boundedWidth + CHART_CONFIG.yAxisOffset}, 
      ${firstGroupY + yGroupScale.bandwidth() - yGroupScale.bandwidth() * CHART_CONFIG.multiplier})`)
    .call(yAxis)
    .select(".domain").remove();

  g.selectAll(".yaxis .tick line")
    .style("stroke", COLORS.chartLight);

  g.selectAll(".yaxis .tick text")
    .style("fill", COLORS.chartMedium);

  // Draw ridgeline areas
  groupsWithOrder.forEach(group => {
    const groupData = data.filter(d => d.group === group.group);

    g.append("path")
      .datum(groupData)
      .attr("class", "joyplot")
      .attr("d", areaGenerator)
      .style("fill", group.group === "PIX" ? COLORS.purple100 : COLORS.aqua)
      .style("fill-opacity", CHART_CONFIG.areaFillOpacity)
      .style("stroke", "white")
      .style("stroke-width", CHART_CONFIG.areaStrokeWidth);
  });

  // Draw group labels
  g.selectAll(".group-label")
    .data(groupsWithOrder)
    .enter()
    .append("text")
    .attr("class", "group-label")
    .attr("x", -CHART_CONFIG.labelOffset)
    .attr("y", (d) => yGroupScale(d.group) + yGroupScale.bandwidth())
    .attr("text-anchor", "end")
    .text((d) => d.group)
    .style("fill", COLORS.chartMedium);

  // Set up hover interactions
  maxAreaHeight = densityScale(maxValue);

  hoverLine = g
    .append("line")
    .attr("class", "hover-line")
    .style("stroke", COLORS.chartMedium)
    .style("stroke-dasharray", CHART_CONFIG.hoverLineDashArray);

  hoverCircles = g.selectAll(".hover-circle")
    .data(orderedGroups)
    .enter()
    .append("circle")
    .attr("class", "hover-circle")
    .attr("r", CHART_CONFIG.hoverCircleRadius)
    .style("fill", COLORS.chartMedium)
    .style("opacity", 0);

  // Hover overlay rectangle
  g.append("rect")
    .attr("class", "overlay")
    .attr("y", -maxAreaHeight)
    .attr("width", boundedWidth)
    .attr("height", boundedHeight + maxAreaHeight)
    .style("opacity", 0)
    .on("mousemove", handleMouseMove)
    .on("mouseout", hideVerticalHover);

  // Initialize tooltips
  tooltipContainer = d3.select(".tooltip-container");
  groupTooltips = createGroupTooltips();
}

/**
 * Returns groups sorted by current variable's order
 */
function getOrderedGroups() {
  return groupsWithOrder.sort((a, b) => {
      if (currentVar === "transactions") {
        return a.orderTransaction - b.orderTransaction;
      } else {
        return a.orderVolume - b.orderVolume;
      }
    })
    .map((d) => d.group);
}

/**
 * Creates tooltip elements for each payment method group
 */
function createGroupTooltips() {
  return orderedGroups.map((groupName) => {
    return tooltipContainer
      .append("div")
      .attr("class", `tooltip tooltip-${groupName.replace(/\s+/g, "-")}`)
      .style("position", "absolute")
      .style("background", "#F3F3F3")
      .style("color", "#333333")
      .style("padding", CHART_CONFIG.tooltip.padding)
      .style("border-radius", CHART_CONFIG.tooltip.borderRadius)
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("white-space", "nowrap")
      .style("box-shadow", `3px 3px 10px ${COLORS.chartMedium}`);
  });
}

/**
 * Calculates the highest (lowest Y) point at the current X position
 */
function getHighestPointAtX() {
  if (quarterData.length === 0) return 0;
  let minY = Infinity;

  quarterData.forEach(d => {
    const y = yGroupScale(d.group) + yGroupScale.bandwidth() - densityScale(d[currentVar]);
    minY = Math.min(minY, y);
  });

  return minY === Infinity ? 0 : minY;
}

/**
 * Hides the vertical hover line and all tooltips
 */
function hideVerticalHover() {
  hoverLine.style("opacity", 0);
  hoverCircles.style("opacity", 0);

  if (groupTooltips) {
    groupTooltips.forEach((tooltip) => {
      tooltip.transition().duration(CHART_CONFIG.tooltipFadeDuration).style("opacity", 0);
    });
  }
}

/**
 * Handles mouse movement over the chart for hover interactions
 */
function handleMouseMove(e) {
  const [mouseX] = d3.pointer(e);

  const allQuarters = xScale.domain();
  let closestQuarter = allQuarters[0];
  let minDistance = Math.abs(mouseX - xScale(allQuarters[0]));

  allQuarters.forEach((quarter) => {
    const distance = Math.abs(mouseX - xScale(quarter));
    if (distance < minDistance) {
      minDistance = distance;
      closestQuarter = quarter;
    }
  });

  const x = xScale(closestQuarter);
  quarterData = data.filter((d) => d.date == closestQuarter);
  const chartHighestY = getHighestPointAtX(x);

  hoverLine
    .attr("x1", x)
    .attr("x2", x)
    .attr("y1", chartHighestY)
    .attr("y2", boundedHeight)
    .style("opacity", 1);

  orderedGroups.forEach((groupName, index) => {
    const groupData = quarterData.find((d) => d.group == groupName);

    if (groupData && groupTooltips[index]) {
      const y =
        yGroupScale(groupData.group) +
        yGroupScale.bandwidth() -
        densityScale(groupData[currentVar]);

      hoverCircles
        .filter((d) => d === groupName)
        .style("opacity", 1)
        .attr("cx", x)
        .attr("cy", y);

      const tooltip = groupTooltips[index];
      const svgRect = svg.node().getBoundingClientRect();

      const pageX = svgRect.left + margin.left + x;
      const pageY = svgRect.left + margin.top + y;

      const tooltipWidth = CHART_CONFIG.tooltip.width;

      const needsRightAlign = pageX + CHART_CONFIG.tooltip.offsetX + tooltipWidth > window.innerWidth - CHART_CONFIG.tooltip.rightMargin;

      if (needsRightAlign) {
        const rightDistance = window.innerWidth - pageX + CHART_CONFIG.tooltip.offsetY;

        tooltip
          .style("left", "auto")
          .style("right", rightDistance + "px")

      } else {
        tooltip
          .style("right", "auto")
          .style("left", pageX + CHART_CONFIG.tooltip.offsetX + "px")
          .style("top", pageY - CHART_CONFIG.tooltip.offsetY + "px");
      }

      const [year, quarter] = closestQuarter.split("-");
      const quarterDisplay = `${year} ${quarter}`;
      const color = groupName === "PIX" ? COLORS.purple100 : COLORS.pixHighlight; 

      tooltip
        .style("top", pageY - CHART_CONFIG.tooltip.offsetY + "px")
        .html(
            `
            <div style="font-weight: bold; color: ${color}">${groupData.group}</div>
                <div><strong>${quarterDisplay}:</strong> ${groupData[currentVar].toFixed(1)} 
            </div>
            `)
        .style("opacity", 1);
    } else {
      hoverCircles.filter((d) => d === groupName).style("opacity", 0);

      if (groupTooltips[index]) {
        groupTooltips[index].transition().duration(CHART_CONFIG.tooltipFadeDuration).style("opacity", 0);
      }
    }
  });

}

/**
 * Updates the chart when switching between transactions and volume views
 * @param {string} newVar - The variable to display ('transactions' or 'volume')
 */
function updateChart(newVar) {
  currentVar = newVar;

  d3.selectAll("button").classed("active", false);
  d3.select(`#${newVar}-btn`).classed("active", true);

  orderedGroups = getOrderedGroups();
  yGroupScale.domain(orderedGroups);
  groupTooltips = createGroupTooltips();

  g.selectAll(".joyplot")
    .transition()
    .duration(CHART_CONFIG.transitionDuration)
    .ease(d3.easeQuadInOut)
    .attr("d", areaGenerator);

  g.selectAll(".group-label")
    .transition()
    .duration(CHART_CONFIG.transitionDuration)
    .ease(d3.easeQuadInOut)
    .attr("y", (d) => yGroupScale(d.group) + yGroupScale.bandwidth());

  hoverCircles
    .data(orderedGroups)
    .transition()
    .duration(CHART_CONFIG.transitionDuration)
    .ease(d3.easeQuadInOut);
}

d3.select("#transactions-btn").on("click", () => updateChart("transactions"))
d3.select("#volume-btn").on("click", () => updateChart("volume"));