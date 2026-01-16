let aqua = "#4BDBBA";
let purple100 = "#9C50FF";
let chartLight = "#E0E0E0";
let chartMedium = "#808080";
let lightNeonGreen = "#F6FAE6";

let circlePackData = [];
let currentScreen = 0;
let data;

const width = window.innerWidth;
const height = window.innerHeight;

const margin = { top: 0, right: 20, bottom: 40, left: 20 };

let boundedWidth = width - margin.left - margin.right;
let boundedHeight = height - margin.top - margin.bottom;

d3.csv("market_vol.csv", (d) => ({

  country: d.country,
  category: d.category,
  class: d.classificacao,
  volume: +d.value,

})).then((loadedData) => {
  data = loadedData;

  initChart();
});

function initChart() {
    setupNavigationEvents();
    prepareCirclePackData();
    showScreen(0);
}

function prepareCirclePackData() {

    const classValues = [...new Set(data.map(d => d.class))]

    classValues.forEach((classValue, index) => {
        const classData = data.filter(d => d.class === classValue)

        const countryCategories = d3.rollup(
            classData,
            v => d3.sum(v, d => d.volume),
            d => d.country,
            d => d.category
        );

        circlePackData[index] = {
            title: classValue,
            classValue: classValue,
            data: {
                name: classValue,
                children: Array.from(countryCategories, ([country, categories]) => ({
                    name: country,
                    children: Array.from(categories, ([category, volume]) => ({
                        name: category,
                        value: volume
                    }))
                }))
            }
        }
    })

}

function showScreen(screenIndex) {
    currentScreen = screenIndex

    updateNavigation()

    d3.select("#chart-area").selectAll("*").remove()

    createCirclePack(circlePackData[screenIndex])
}

function createCirclePack(screenData) {

    const svg = d3.select("#chart-area")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("width", width)
        .attr("height", height);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const tooltip = d3.select(".tooltip")

    const pack = d3.pack()
        .size([boundedWidth, boundedHeight])
        .padding(5)

    const root = d3.hierarchy(screenData.data)
        .sum(d => d.value)
        .sort((a,b) => b.value - a.value);

    pack(root)

     const allCategories = [...new Set(data.map((d) => d.category))];
     const colorScale = d3
       .scaleOrdinal(["#C599FF", "#BA5E00", "#9C50FF", "#FFC78C", "#FF8200"])
       .domain(allCategories);

    const node = g.selectAll(".node")
        .data(root.descendants().filter(d => d.depth > 0))
        .enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.x}, ${d.y})`)

    //draw circles
    node
      .append("circle")
      .attr("r", (d) => d.r)
      .style("fill", (d) => {
        if (d.depth === 1) {
          return lightNeonGreen;
        } else {
          return colorScale(d.data.name);
        }
      })
      .style("stroke", (d) => {
        if (d.depth === 1) {
          return chartLight;
        } else {
          return "none";
        }
      })
      .on("mouseover", function (event, d) {
        let tooltipContent;
        if (d.depth === 1) {
            return
        } else {
            const volume = d.value.toLocaleString();
            const country = d.parent.data.name;
            tooltipContent = `
            <strong>${d.data.name} in ${country}</strong><br/>
            ${volume}`;
        }

        tooltip.html(tooltipContent).style("opacity", 1);
      })
      .on("mousemove", function (event) {
        tooltip
          .style("top", event.pageY - 10 + "px")
          .style("left", event.pageX + 10 + "px");
      })
      .on("mouseout", function () {
        tooltip.style("opacity", 0);
      });

    //TEXT
    if (root.descendants().filter((d) => d.depth === 1).length > 0) {
      createCountryLabels(g, root.descendants().filter((d) => d.depth === 1)
      );
    }

    d3.select(".screen-title").text(screenData.title);

    const categoryNodes = node.filter((d) => d.depth > 1);

    const categoriesLabels = categoryNodes.append("text")
        .attr("dy", "0.3em")
        .attr("x", 0)
        .style("text-anchor", "middle")
        .style("font-size", (d) => Math.min(d.r / 2, 13) + "px")
        .style("pointer-events", "none");

    categoriesLabels.each(function (d) {
      if (d.r > 20) {
        const textElement = d3.select(this);
        const name = d.data.name;

        if (name.length > 10) {
          textElement.selectAll("*").remove();
          const words = name.split(/\s+/);

          words.forEach((word, i) => {
            textElement
              .append("tspan")
              .attr("x", 0)
              .attr("dy", i === 0 ? "-0.1em" : "1.1em")
              .text(word);
          });
        } else {
          textElement.text(name);
        }
      }
    });

}

function createCountryLabels(svg, countryNodes) {

//temp labels to get bbox
    const tempText = svg.append("text")
        .style("font-size", "11px")
        .style("font-weight", "bold")
        .style("visibility", "hidden");

    const labelData = countryNodes.map((d) => {
        tempText.text(d.data.name);
        const bbox = tempText.node().getBBox();

        const optimalPosition = findOptimalPosition(d, countryNodes, bbox);
        return {
        node: d,
        text: d.data.name,
        x: optimalPosition.x,
        y: optimalPosition.y,
        width: bbox.width,
        height: bbox.height,
        };
    });

  tempText.remove(); //remove temp labels

  // draw actual labels
    svg.selectAll(".country-label")
        .data(labelData)
        .enter()
        .append("text")
        .attr("class", "country-label")
        .attr("x", (d) => d.x)
        .attr("y", (d) => d.y)
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("fill", "#333")
        .style("text-anchor", "start")
        .style("pointer-events", "none")
        .text((d) => d.text);
}

function findOptimalPosition(targetNode, allNodes, textBbox) {
  const minDistance = targetNode.r + 5;
  const angles = [180, 225, 135, 270, 315, 45, 90, 0]; // Left positions first

  for (let angle of angles) {
    const radian = (angle * Math.PI) / 180;
    const distance = minDistance + textBbox.width * 0.3;

    let testX = targetNode.x + Math.cos(radian) * distance;
    let testY = targetNode.y + Math.sin(radian) * distance;

    if (angle > 90 && angle < 270) {
      testX = testX - textBbox.width; // Right-align text for left positions
    }

    if (isValidPosition(testX, testY, textBbox, targetNode, allNodes)) {
      return { x: testX, y: testY };
    }
  }

  return {
    x: Math.max(
      textBbox.width + 10,
      targetNode.x - targetNode.r - textBbox.width - 20
    ),
    y: targetNode.y,
  };
}

function isValidPosition(x, y, textBbox, targetNode, allNodes) {
  if (
    x < 10 ||
    x + textBbox.width > width - 10 ||
    y - textBbox.height < 10 ||
    y > height - 10
  ) {
    return false;
  }

  for (let node of allNodes) {
    const distanceFromCenter = Math.sqrt(
      Math.pow(x + textBbox.width / 2 - node.x, 2) +
        Math.pow(y - textBbox.height / 2 - node.y, 2)
    );

    const minDistance =
      node.r + Math.max(textBbox.width, textBbox.height) * 0.6;

    if (distanceFromCenter < minDistance && node !== targetNode) {
      return false;
    }
  }

  return true;
}

function setupNavigationEvents() {

    d3.select("#prev-btn").on("click", () => {
    if (currentScreen > 0) {
        showScreen(currentScreen - 1);
    }
    });

    d3.select("#next-btn").on("click", () => {
    if (currentScreen < circlePackData.length - 1) {
        showScreen(currentScreen + 1);
    }
    });

    d3.selectAll(".dot").on("click", function (event, d) {
    const index = Array.from(this.parentNode.children).indexOf(this);
    if (index < circlePackData.length) {
        showScreen(index);
    }
    });

}

function updateNavigation() {

  d3.select("#prev-btn").property("disabled", currentScreen === 0);
  d3.select("#next-btn").property(
    "disabled",
    currentScreen === circlePackData.length - 1
  );

  d3.selectAll(".dot").classed("active", false);
  d3.select(`.dot:nth-child(${currentScreen + 1})`).classed("active", true);
}