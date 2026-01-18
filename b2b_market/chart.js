let aqua = "#4BDBBA";
let purple100 = "#9C50FF";
let chartLight = "#E0E0E0";
let chartMedium = "#808080";
let lightNeonGreen = "#F6FAE6";

let circlePackData = [];
let currentScreen = 0;
let data;

const width = window.innerWidth;
const height = window.innerHeight * 0.6;

const margin = { top: 0, right: 20, bottom: 20, left: 20 };

let boundedWidth = width - margin.left - margin.right;
let boundedHeight = height - margin.top - margin.bottom;

const tooltip = d3.select("#tooltip")

let colorScale

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

  d3.select("body").on("click.tooltip", function () {
    hideTooltip();
  });
}

function prepareCirclePackData() {
  const classValues = [...new Set(data.map((d) => d.class))];

  classValues.forEach((classValue, index) => {
    const classData = data.filter((d) => d.class === classValue);

    const countryCategories = d3.rollup(
      classData,
      (v) => d3.sum(v, (d) => d.volume),
      (d) => d.country,
      (d) => d.category,
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
            value: volume,
          })),
        })),
      },
    };
  });
}

function showScreen(screenIndex) {
  currentScreen = screenIndex;

  updateNavigation();

  d3.select("#chart-area").selectAll("*").remove();

  createCirclePack(circlePackData[screenIndex]);
}

function createCirclePack(screenData) {
  const svg = d3
    .select("#chart-area")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const pack = d3.pack().size([boundedWidth, boundedHeight]).padding(5);

  const root = d3
    .hierarchy(screenData.data)
    .sum((d) => d.value)
    .sort((a, b) => b.value - a.value);

  pack(root);

  const allCategories = [...new Set(data.map((d) => d.category))];
  colorScale = d3.scaleOrdinal()
    .domain(allCategories)
    .range(["#C599FF", "#BA5E00", "#9C50FF", "#FFC78C", "#FF8200"]);

  const node = g
    .selectAll(".node")
    .data(root.descendants().filter((d) => d.depth > 0))
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", (d) => `translate(${d.x}, ${d.y})`);

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
      if (d.depth === 1) return;

      showTooltip(event, d);
    })
    .on("mousemove", function (event, d) {
      if (d.depth === 1) return;

      positionTooltip(event);
    })
    .on("mouseout", function () {
      hideTooltip();
    })
    .on("click", function (event, d) {
      if (d.depth === 1) return;

      event.preventDefault();
      event.stopPropagation();

      if (tooltip.style("opacity") === "1") {
        hideTooltip();
      } else {
        showTooltip(event, d);
        positionTooltip(event);
      }
    });

  //TEXT
  if (root.descendants().filter((d) => d.depth === 1).length > 0) {
    createCountryLabels(
      g,
      root.descendants().filter((d) => d.depth === 1),
    );
  }

  d3.select(".screen-title").text(screenData.title);

  const categoryNodes = node.filter((d) => d.depth > 1);

  const categoriesLabels = categoryNodes
    .append("text")
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
  const isMobile = window.innerWidth < 768;
  const baseFontSize = isMobile ? "10px" : "11px";
  const actualFontSize = isMobile ? "12px" : "14px";

  //temp labels to get bbox
  const tempText = svg
    .append("text")
    .style("font-size", baseFontSize)
    .style("font-weight", "bold")
    .style("visibility", "hidden");

  const labelData = countryNodes.map((d) => {
    let displayText = d.data.name;
    let estimatedHeight = 16;
    let willSplit = false;

    // For mobile, check if we should split long multi-word names
    if (isMobile) {
      const words = displayText.split(/\s+/);
      // Only split if it's multi-word AND longer than 14 characters
      if (words.length > 1 && displayText.length > 14) {
        willSplit = true;
        estimatedHeight = 16 * words.length;
        displayText = displayText;
      }
    }

    tempText.text(willSplit ? displayText.split(/\s+/)[0] : displayText); // Use first word for width if splitting
    const bbox = tempText.node().getBBox();

    const adjustedBbox = {
      width: bbox.width,
      height: estimatedHeight,
    };

    const optimalPosition = findOptimalPosition(d, countryNodes, adjustedBbox, isMobile);
    return {
      node: d,
      text: displayText,
      originalText: d.data.name,
      willSplit: willSplit,
      x: optimalPosition.x,
      y: optimalPosition.y,
      width: adjustedBbox.width,
      height: adjustedBbox.height,
    };
  });

  tempText.remove(); //remove temp labels

  // draw actual labels
  svg
    .selectAll(".country-label")
    .data(labelData)
    .enter()
    .append("text")
    .attr("class", "country-label")
    .attr("x", (d) => d.x)
    .attr("y", (d) => d.y)
    .style("font-size", actualFontSize)
    .style("font-weight", "bold")
    .style("fill", "#333")
    .style("text-anchor", "start")
    .style("pointer-events", "none")
    .each(function (d) {
      const textElement = d3.select(this);

      if (d.willSplit) {
        const words = d.originalText.split(/\s+/);

        words.forEach((word, i) => {
          textElement
            .append("tspan")
            .attr("x", d.x)
            .attr("dy", i === 0 ? "0em" : "1.1em")
            .text(word);
        });
      } else {
        textElement.text(d.text);
      }
    });
}

function findOptimalPosition(targetNode, allNodes, textBbox, isMobile) {
  const minDistance = targetNode.r + (isMobile ? 3 : 5);
  const angles = isMobile
    ? [270, 90, 180, 0, 225, 135, 315, 45] 
    : [180, 225, 135, 270, 315, 45, 90, 0];

  for (let angle of angles) {
    const radian = (angle * Math.PI) / 180;
    const distance = minDistance + textBbox.width * (isMobile ? 0.1 : 0.3);

    let testX = targetNode.x + Math.cos(radian) * distance;
    let testY = targetNode.y + Math.sin(radian) * distance;

    if (angle > 90 && angle < 270) {
      testX = testX - textBbox.width; // Right-align text for left positions
    }

    if (isValidPosition(testX, testY, textBbox, targetNode, allNodes)) {
      return { x: testX, y: testY };
    }
  }

  const fallbackX = isMobile 
    ? Math.min(Math.max(10, targetNode.x - textBbox.width/2), width - textBbox.width - 10)
    : Math.max(textBbox.width + 10, targetNode.x - targetNode.r - textBbox.width - 20);
    
  const fallbackY = isMobile
    ? Math.min(Math.max(textBbox.height + 10, targetNode.y - targetNode.r - 15), height - 10)
    : targetNode.y;

  return {
    x: fallbackX,
    y: fallbackY,
  };
}

function isValidPosition(x, y, textBbox, targetNode, allNodes, isMobile) {

  const margin = isMobile ? 5 : 10;

  if (
    x < margin ||
    x + textBbox.width > width - 10 ||
    y - textBbox.height < 10 ||
    y > height - 10
  ) {
    return false;
  }

  const overlapTolerance = isMobile ? 0.4 : 0.6;

  for (let node of allNodes) {
    const distanceFromCenter = Math.sqrt(
      Math.pow(x + textBbox.width / 2 - node.x, 2) +
        Math.pow(y - textBbox.height / 2 - node.y, 2),
    );

    const minDistance =
      node.r + Math.max(textBbox.width, textBbox.height) * overlapTolerance;

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
    currentScreen === circlePackData.length - 1,
  );

  d3.selectAll(".dot").classed("active", false);
  d3.select(`.dot:nth-child(${currentScreen + 1})`).classed("active", true);
}

function showTooltip(event, d) {
  const volume = d.value.toLocaleString();
  const country = d.parent.data.name;
  const tooltipContent = `
    <strong style="color: ${colorScale(d.data.name)}">${d.data.name}</strong>
    <strong> in ${country}</strong><br/>
    ${volume}`;

  tooltip.html(tooltipContent).style("opacity", 1);
  positionTooltip(event);
}

function hideTooltip() {
  tooltip.style("opacity", 0);
}

function positionTooltip(event) {
  const tooltipNode = tooltip.node();
  const tooltipRect = tooltipNode.getBoundingClientRect();

  let left = event.pageX + 10;
  let top = event.pageY - 10;

  if (left + tooltipRect.width > window.innerWidth - 20) {
    left = event.pageX - tooltipRect.width - 10;
  }

  if (top + tooltipRect.height > window.innerHeight - 20) {
    top = event.pageY - tooltipRect.height - 10;
  }

  if (left < 10) {
    left = 10;
  }

  if (top < 10) {
    top = event.pageY + 20;
  }

  tooltip
    .style("left", left + "px")
    .style("top", top + "px");
}