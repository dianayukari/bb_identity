let purple100 = "#9C50FF";
let chartLight = "#E0E0E0";
let chartMedium = "#808080";
let darkOrange = "#BA5E00";
let lightNeonGreen = "#F6FAE6";

const container_br = d3.select(".container_br");
const margin = { top: 10, right: 20, bottom: 20, left: 110 };

const tooltip = d3.select(".tooltip")

let width =
  Math.min(container_br.node().getBoundingClientRect().width, 1200) || 400;
let height = 200;

let boundedWidth = width - margin.left - margin.right;
let boundedHeight = height - margin.top - margin.bottom;

//LEGEND
  const globalLegend = d3.select(".legend")
   
  const ebanxLegend = globalLegend.append("div")
    .style("display", "flex")
    .style("align-items", "center")
    .style("gap", "5px");

  ebanxLegend.append("div")
    .style("width", "15px")
    .style("height", "15px")
    .style("background", purple100);

  ebanxLegend.append("span").style("font-size", "13px").text("EBANX Merchants");

    const marketLegend = globalLegend.append("div")
      .style("display", "flex")
      .style("align-items", "center")
      .style("gap", "5px");

    marketLegend.append("div")
      .style("width", "12px")
      .style("height", "12px")
      .style("background", darkOrange)
      .style("border", `2px solid ${lightNeonGreen}`)
      .style("border-radius", "50%");

    marketLegend.append("span")
      .style("font-size", "13px")
      .text("Market Average");

//read and parse data
d3.csv("pay_profile_br.csv", (d) => ({
 
    vertical: d.merchant_vertical_commercial,
    method: d.metodo_de_pagamento_ajustado,
    value: +d.value * 100,
    type: d.type,

})).then((loadedData) => {

    data_ebanx = loadedData.filter((d) => d.type == "pct_tpv_ebanx_b2b");
    data_market = loadedData.filter((d) => d.type == "market_average");

    initChartBr();

});


function initChartBr() {
  const groupedEbanx = d3.group(data_ebanx, (d) => d.vertical);
  const groupedMarket = d3.group(data_market, (d) => d.vertical);

  const verticals = Array.from(groupedEbanx, ([vertical, methods]) => ({
    vertical: vertical,
    methods: methods.sort((a, b) => b.value - a.value),
    marketData: groupedMarket.get(vertical) || []
  }));

  verticals.forEach((verticalData, index) => {
    createBarChart(verticalData, index, container_br);
  });
}

function createBarChart(verticalData, index, container) {

    const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidyMid meet")
        .attr("width", width)

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);
  
    //scales
    const xScale = d3.scaleLinear()
        .domain([0, 100])
        .range([0, boundedWidth]);

    const yScale = d3.scaleBand()
        .domain(verticalData.methods.map((d) => d.method))
        .range([20, boundedHeight])
        .padding(0.1);

    //draw bars
    g.selectAll(".bar")
      .data(verticalData.methods)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", 0)
      .attr("y", (d) => yScale(d.method))
      .attr("width", (d) => xScale(d.value))
      .attr("height", yScale.bandwidth())
      .attr("fill", purple100)
      .on("mouseover", function (event, d) {
          tooltip.transition().duration(200).style("opacity", 1);
          tooltip.html(
              `<div><strong style="color: ${purple100}">EBANX Merchants:</strong> ${d.value.toFixed(0)}</div>`
          )
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mouseout", function (event, d) {
        tooltip.transition().duration(200).style("opacity", 0);
      });

    // draw dots
    g.selectAll(".market-dot")
      .data(verticalData.marketData)
      .enter()
      .append("circle")
      .attr("cx", (d) => xScale(d.value))
      .attr("cy", (d) => yScale(d.method) + yScale.bandwidth() / 2)
      .attr("r", 5)
      .attr("fill", darkOrange)
      .attr("stroke", lightNeonGreen)
      .attr("stroke-width", 1)
      .on("mouseover", function (e, d) {
        tooltip.transition().duration(200).style("opacity", 1);
          tooltip
            .html(
              `<div><strong style="color: ${darkOrange}">Market Average:</strong> ${d.value.toFixed(0)}</div>`
            )
            .style("left", e.pageX + 10 + "px")
            .style("top", e.pageY - 10 + "px");
      })
      .on("mouseout", function (event, d) {
        tooltip.transition().duration(200).style("opacity", 0);
      });

    //draw X axis
    g.append("g")
        .attr("class", "xaxis")
        .attr("transform", `translate(0, ${height - margin.bottom - 10})`)
        .call(d3.axisBottom(xScale)
            .ticks(getResponsiveTickCount())
        )
        .select(".domain").remove()

    g.selectAll(".xaxis .tick text")
        .style("fill", chartMedium)
        .style("font-size", "13px")

    g.selectAll(".xaxis .tick line").style("stroke", chartLight);

    //draw Y axis
    g.selectAll(".method-label")
        .data(verticalData.methods)
        .enter()
        .append("text")
        .attr("class", "method-label")
        .attr("x", -10)
        .attr("y", d => yScale(d.method) + yScale.bandwidth()/2 + 5)
        .attr("text-anchor", "end")
        .text(d => d.method)
        .style("font-size", "13px")

    //vertical title
    svg.append("text")
        .attr("x", 0)
        .attr("y", 15)
        .text(verticalData.vertical)
        .style("font-size", "14px")
        .style("font-weight", "bold")

      
}

function getResponsiveTickCount() {
  const screenWidth = window.innerWidth;

  if (screenWidth < 480) {
    return 3;
  } else {
    return 5;
  }
  
}
