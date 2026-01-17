let data;
let xScale, yGroupScale, yScale, densityScale, areaGenerator, xAxis, yAxis;
let orderedGroups, groupsWithOrder;
let maxValue, maxAreaHeight, currentMaxY, quarterData;
let hoverLine, hoverCircles, tooltipContainer, groupTooltips;

let aqua = "#4BDBBA";
let purple100 = "#9C50FF";
let chartLight = "#E0E0E0";
let chartMedium = "#808080";

const padding = 10
const multiplier = 1.6

const svg = d3.select("#joyplot");
const container = d3.select(".container");
const margin = {top: 160, right: 40, bottom: 40, left: 130};

let width = window.innerWidth;
let height = 800;
let currentVar = "transactions";

let boundedWidth = width - margin.left - margin.right
let boundedHeight = height - margin.top - margin.bottom

svg.attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidyMid meet");

const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`)

const parseDate = d3.timeParse("%Y-%m");

d3.csv("transactions_joyplot.csv", (d) => ({
    group: d.payment_method,
    date: d.date,
    transactions: +d.transactions * 100,
    volume: +d.value * 100,
    orderTransaction: +d.order_transaction,
    orderVolume: +d.order_volume
})).then( loadedData => {
    data = loadedData;

    initChart();
});

function initChart() {
    groupsWithOrder = [...new Set (data.map(d => d.group))]
        .map(groupName => {
            const sampleRow = data.find(d => d.group === groupName);
            return {
                group: groupName,
                orderTransaction: sampleRow.orderTransaction,
                orderVolume: sampleRow.orderVolume
            }
        })

    orderedGroups = getOrderedGroups();

    //scales
        //x

    xScale = d3.scalePoint()
        .domain(data.map(d => d.date).sort())
        .range([0, boundedWidth])

    function getResponsiveQ1Ticks() {
        const containerWidth = container.node().getBoundingClientRect().width;
        const q1Quarters = [...new Set(data.map((d) => d.date))]
        .sort()
        .filter((quarter) => quarter.endsWith("-Q1"));

        if (containerWidth < 480) {
        return q1Quarters.filter((d, i) => i % 2 === 0);
        } else {
        return q1Quarters;
        }
    }

    xAxis = d3.axisBottom(xScale)
        .tickValues(getResponsiveQ1Ticks())
        .tickFormat(d => d.split('-')[0]);

        //y
    yGroupScale = d3.scaleBand()
        .domain(orderedGroups)
        .range([0, boundedHeight])
        .paddingInner(-0.5)

    const firstGroupName = orderedGroups[0];
    const firstGroupData = data.filter(d => d.group == firstGroupName);
    const firstGroupY = yGroupScale(firstGroupName);
     
    yScale = d3.scaleLinear()
        .domain([0, d3.max(firstGroupData, d => d[currentVar])])
        .range([yGroupScale.bandwidth()*multiplier, 0])

    yAxis = d3.axisRight(yScale)
        .ticks(4)

        //area 
    maxValue = d3.max(data, d => d[currentVar])

    densityScale = d3.scaleLinear()
        .domain([0, maxValue])
        .range([0, yGroupScale.bandwidth() * multiplier])

    areaGenerator = d3.area()
      .x((d) => xScale(d.date))
      .y0((d) => yGroupScale(d.group) + yGroupScale.bandwidth())
      .y1((d) => yGroupScale(d.group) + yGroupScale.bandwidth() - densityScale(d[currentVar]))
      .curve(d3.curveBasis);

    //draw axis
    g.append("g")
        .attr("class", "axis xaxis")
        .attr("transform", `translate(0, ${boundedHeight + padding})`)
        .call(xAxis)
        .select(".domain").remove();
    
    g.selectAll(".xaxis .tick line")
        .style("stroke", chartLight)

    g.selectAll(".xaxis .tick text")
        .style("fill", chartMedium);
    
    g.append("g")
        .attr("class", "axis yaxis")
        .attr("transform", `translate(${boundedWidth + 5}, 
            ${firstGroupY + yGroupScale.bandwidth() - yGroupScale.bandwidth()* multiplier})`)
        .call(yAxis)
        .select(".domain").remove();

    g.selectAll(".yaxis .tick line")
        .style("stroke", chartLight)

    g.selectAll(".yaxis .tick text")
        .style("fill", chartMedium)


    //draw areas
    groupsWithOrder.forEach(group => {
        const groupData = data.filter(d => d.group === group.group);

        g.append("path")
            .datum(groupData)
            .attr("class", "joyplot")
            .attr("d", areaGenerator)
            .style("fill", group.group === "PIX" ? purple100 : aqua)
            .style("fill-opacity", 0.6)
            .style("stroke", "white")
            .style("stroke-width", 2);

    })

    //draw labels
    g.selectAll(".group-label")
      .data(groupsWithOrder)
      .enter()
      .append("text")
      .attr("class", "group-label")
      .attr("x", -10)
      .attr("y", (d) => yGroupScale(d.group) + yGroupScale.bandwidth())
      .attr("text-anchor", "end")
      .text((d) => d.group)
      .style("fill", chartMedium);

      //HOVER

    maxAreaHeight = densityScale(maxValue);

    hoverLine = g
        .append("line")
        .attr("class", "hover-line")
        .style("stroke", chartMedium)
        .style("stroke-dasharray", "4");

    hoverCircles = g.selectAll(".hover-circle")
        .data(orderedGroups)
        .enter()
        .append("circle")
        .attr("class", "hover-circle")
        .attr("r", 4)
        .style("fill", chartMedium)
        .style("opacity", 0)

    g.append("rect")
        .attr("class", "overlay")
        .attr("y", -maxAreaHeight)
        .attr("width", boundedWidth)
        .attr("height", boundedHeight + maxAreaHeight)
        .style("opacity", 0)
        .on("mousemove", handleMouseMove)
        .on("mouseout", hideVerticalHover);

    //TOOLTIP
    tooltipContainer = d3.select(".tooltip-container")
    groupTooltips = createGroupTooltips()

}

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

function createGroupTooltips() {

    return orderedGroups.map((groupName) => {

    return tooltipContainer
        .append("div")
        .attr("class", `tooltip tooltip-${groupName.replace(/\s+/g, "-")}`)
        .style("position", "absolute")
        .style("background", "#F3F3F3")
        .style("color", "#333333")
        .style("padding", "6px 10px")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .style("white-space", "nowrap")
        .style("box-shadow", `3px 3px 10px ${chartMedium}` )
    });
}

function getHighestPointAtX() {
    
    if (quarterData.length === 0) return 0;
    let minY = Infinity;
    
    quarterData.forEach(d => {
        const y = yGroupScale(d.group) + yGroupScale.bandwidth() - densityScale(d[currentVar]);
        minY = Math.min(minY, y);
    });
    
    return minY === Infinity ? 0 : minY;
  };

function hideVerticalHover() {
    hoverLine.style("opacity", 0);
    hoverCircles.style("opacity", 0);

    if (groupTooltips) {
        groupTooltips.forEach((tooltip) => {
        tooltip.transition().duration(200).style("opacity", 0);
        });
    }
}

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
      const containerRect = container.node().getBoundingClientRect();
      const svgRect = svg.node().getBoundingClientRect();

      const pageX = svgRect.left + margin.left + x;
      const pageY = svgRect.left + margin.top + y;

      const tooltipWidth = 130;

      const needsRightAlign = pageX + 10 + tooltipWidth > window.innerWidth - 20;

      if (needsRightAlign) {
        const rightDistance = window.innerWidth - pageX + 15;

        tooltip
          .style("left", "auto")
          .style("right", rightDistance + "px")

      } else {
        tooltip
          .style("right", "auto")
          .style("left", pageX + 10 + "px")
          .style("top", pageY - 15 + "px");
      }

      const [year, quarter] = closestQuarter.split("-");
      const quarterDisplay = `${year} ${quarter}`;
    const color = groupName === "PIX" ? purple100 : "#2C806C"; 

      tooltip
        .style("top", pageY - 15 + "px")
        .html(
            `
            <div style="font-weight: bold; color: ${color}">${groupData.group}</div>
                <div><strong>${quarterDisplay}:</strong> ${groupData[currentVar].toFixed(0)} 
            </div>
            `)
        .style("opacity", 1);
    } else {
      hoverCircles.filter((d) => d === groupName).style("opacity", 0);

      if (groupTooltips[index]) {
        groupTooltips[index].transition().duration(200).style("opacity", 0);
      }
    }
  });
}

function updateChart(newVar) {
    currentVar = newVar;

    d3.selectAll("button").classed("active", false)
    d3.select(`#${newVar}-btn`).classed("active", true)

    orderedGroups = getOrderedGroups();
    yGroupScale.domain(orderedGroups);
    groupTooltips = createGroupTooltips();

    g.selectAll(".joyplot")
        .transition()
        .duration(1200)
        .ease(d3.easeQuadInOut)
        .attr("d", areaGenerator)

    g.selectAll(".group-label")
        .transition()
        .duration(1200)
        .ease(d3.easeQuadInOut)
        .attr("y", (d) => yGroupScale(d.group) + yGroupScale.bandwidth());

    hoverCircles
        .data(orderedGroups)
        .transition()
        .duration(1200)
        .ease(d3.easeQuadInOut);

}

d3.select("#transactions-btn").on("click", () => updateChart("transactions"))
d3.select("#volume-btn").on("click", () => updateChart("volume"));