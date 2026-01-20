const COLORS = {
  aqua: "#4BDBBA",
  purple100: "#9C50FF",
  chartLight: "#E0E0E0",
  chartMedium: "#808080",
  lightNeonGreen: "#F6FAE6",
};

const CHART_CONFIG = {
  width: window.innerWidth,
  height: window.innerHeight * 0.6,
  margin: { top: 0, right: 20, bottom: 20, left: 20 },
};

const RESPONSIVE_CONFIG = {
  mobileBreakpoint: 768,
  circlePadding: 5,
  minLabelRadius: 20,
  maxCategoryFontSize: 13,
  baseFontSizes: {
    mobile: "10px",
    desktop: "11px",
  },
  actualFontSizes: {
    mobile: "12px",
    desktop: "14px",
  },
};

const POSITIONING = {
  labelMinDistance: {
    mobile: 3,
    desktop: 5,
  },
  overlapTolerance: {
    mobile: 0.4,
    desktop: 0.6,
  },
  margins: {
    mobile: 5,
    desktop: 10,
  },
};

let boundedWidth = CHART_CONFIG.width - CHART_CONFIG.margin.left - CHART_CONFIG.margin.right;
let boundedHeight = CHART_CONFIG.height - CHART_CONFIG.margin.top - CHART_CONFIG.margin.bottom;

let circlePackData = [];
let currentScreen = 0;
let data;
let colorScale;

const tooltip = d3.select("#tooltip");

// Helper functions for responsive design
function isMobileViewport() {
  return window.innerWidth < RESPONSIVE_CONFIG.mobileBreakpoint;
}

function shouldSplitText(text, isMobile) {
  const words = text.split(/\s+/);
  return isMobile && words.length > 1 && text.length > 14;
}

function estimateTextDimensions(text, willSplit) {
  const baseHeight = 16;
  if (willSplit) {
    const wordCount = text.split(/\s+/).length;
    return { height: baseHeight * wordCount };
  }
  return { height: baseHeight };
}

// Circle styling helper functions
function getCircleFillColor(d) {
  if (d.depth === 1) {
    return COLORS.lightNeonGreen;
  }
  return colorScale(d.data.name);
}

function getCircleStrokeColor(d) {
  return d.depth === 1 ? COLORS.chartLight : "none";
}

// Load and parse CSV data
d3.csv("market_vol.csv", (d) => ({
  country: d.country,
  category: d.category,
  class: d.classificacao,
  volume: +d.value,
})).then((loadedData) => {
  data = loadedData;

  initChart();
});


/**
 * Initializes chart, set up event handlers and prepares data
 */

function initChart() {
  setupNavigationEvents();
  prepareCirclePackData();
  showScreen(0);

  d3.select("body").on("click.tooltip", function () {
    hideTooltip();
  });
}

/**
 * Transforms raw CSV data into hierarchical structure for circle packing
 * Creates separate datasets for each class value
 */
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

/**
 * Displays a specific screen/class of data
 */
function showScreen(screenIndex) {
  currentScreen = screenIndex;
  updateNavigation();

  // Clear previous chart content
  d3.select("#chart-area").selectAll("*").remove();

  // Render new screen data
  createCirclePack(circlePackData[screenIndex]);
}

/**
 * Creates and renders a circle pack visualization for the given screen data
 */
function createCirclePack(screenData) {
  const svg = d3
    .select("#chart-area")
    .append("svg")
    .attr("width", CHART_CONFIG.width)
    .attr("height", CHART_CONFIG.height);

  const g = svg
    .append("g")
    .attr("transform", `translate(${CHART_CONFIG.margin.left}, ${CHART_CONFIG.margin.top})`);

  const pack = d3.pack()
    .size([boundedWidth, boundedHeight])
    .padding(RESPONSIVE_CONFIG.circlePadding);

  const root = d3
    .hierarchy(screenData.data)
    .sum((d) => d.value)
    .sort((a, b) => b.value - a.value);

  pack(root);

  const allCategories = [...new Set(data.map((d) => d.category))];
  colorScale = d3
    .scaleOrdinal()
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
    .style("fill", getCircleFillColor)
    .style("stroke", getCircleStrokeColor)
    .on("mouseover", function (event, d) {
      // Only show tooltip for leaf nodes (categories)
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
      showTooltip(event, d);
      positionTooltip(event);
      
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

  // Add category labels inside circles
  const categoriesLabels = categoryNodes
    .append("text")
    .attr("dy", "0.3em")
    .attr("x", 0)
    .style("text-anchor", "middle")
    .style("font-size", (d) => Math.min(d.r / 2, RESPONSIVE_CONFIG.maxCategoryFontSize) + "px")
    .style("pointer-events", "none");

  categoriesLabels.each(function (d) {
    // Only add labels to circles large enough to read
    if (d.r > RESPONSIVE_CONFIG.minLabelRadius) {
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

/**
 * Creates and positions country labels around circle nodes
 */
function createCountryLabels(svg, countryNodes) {
  const isMobile = isMobileViewport();
  const baseFontSize = isMobile ? RESPONSIVE_CONFIG.baseFontSizes.mobile : RESPONSIVE_CONFIG.baseFontSizes.desktop;
  const actualFontSize = isMobile ? RESPONSIVE_CONFIG.actualFontSizes.mobile : RESPONSIVE_CONFIG.actualFontSizes.desktop;

  //temp labels to get bbox
  const tempText = svg
    .append("text")
    .style("font-size", baseFontSize)
    .style("font-weight", "bold")
    .style("visibility", "hidden");

  const labelData = countryNodes.map((d) => {
    let displayText = d.data.name;
    const willSplit = shouldSplitText(displayText, isMobile);
    const dimensions = estimateTextDimensions(displayText, willSplit);
    
    // For mobile, check if we should split long multi-word names
    if (willSplit) {
      displayText = displayText; // Keep original text for splitting later
    }

    // Use first word for width measurement if splitting
    tempText.text(willSplit ? displayText.split(/\s+/)[0] : displayText);
    const bbox = tempText.node().getBBox();

    const adjustedBbox = {
      width: bbox.width,
      height: dimensions.height,
    };

    const optimalPosition = findOptimalPosition(
      d,
      countryNodes,
      adjustedBbox,
      isMobile,
    );
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

/**
 * Finds optimal position for country labels around circle nodes
 * @param {Object} targetNode - The node to position label for
 * @param {Array} allNodes - All country nodes for collision detection
 * @param {Object} textBbox - Text bounding box dimensions
 * @param {boolean} isMobile - Whether in mobile viewport
 * @returns {Object} Position with x, y coordinates
 */
function findOptimalPosition(targetNode, allNodes, textBbox, isMobile) {
  const minDistance = targetNode.r + (isMobile ? POSITIONING.labelMinDistance.mobile : POSITIONING.labelMinDistance.desktop);
  
  // Try positions in order of preference (left first for readability)
  const angles = isMobile
    ? [270, 90, 180, 0, 225, 135, 315, 45] // Mobile: prefer top/bottom
    : [180, 225, 135, 270, 315, 45, 90, 0]; // Desktop: prefer left

  for (let angle of angles) {
    const radian = (angle * Math.PI) / 180;
    const distance = minDistance + textBbox.width * (isMobile ? 0.1 : 0.3);

    let testX = targetNode.x + Math.cos(radian) * distance;
    let testY = targetNode.y + Math.sin(radian) * distance;

    // Adjust text alignment for left-side positions
    if (angle > 90 && angle < 270) {
      testX = testX - textBbox.width; // Right-align text for left positions
    }

    // Return first valid position found
    if (isValidPosition(testX, testY, textBbox, targetNode, allNodes)) {
      return { x: testX, y: testY };
    }
  }

  // Fallback positioning when no optimal position found
  const fallbackX = isMobile
    ? Math.min(
        Math.max(10, targetNode.x - textBbox.width / 2),
        CHART_CONFIG.width - textBbox.width - 10,
      )
    : Math.max(
        textBbox.width + 10,
        targetNode.x - targetNode.r - textBbox.width - 20,
      );

  const fallbackY = isMobile
    ? Math.min(
        Math.max(textBbox.height + 10, targetNode.y - targetNode.r - 15),
        CHART_CONFIG.height - 10,
      )
    : targetNode.y;

  return {
    x: fallbackX,
    y: fallbackY,
  };
}

/**
 * Validates if a label position is within bounds and doesn't overlap with circles
 */
function isValidPosition(x, y, textBbox, targetNode, allNodes) {
  const isMobile = isMobileViewport();
  const margin = isMobile ? POSITIONING.margins.mobile : POSITIONING.margins.desktop;

  // Check if position is within viewport bounds
  if (
    x < margin ||
    x + textBbox.width > CHART_CONFIG.width - 10 ||
    y - textBbox.height < 10 ||
    y > CHART_CONFIG.height - 10
  ) {
    return false;
  }

  const overlapTolerance = isMobile ? POSITIONING.overlapTolerance.mobile : POSITIONING.overlapTolerance.desktop;

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

/**
 * Sets up event handlers for navigation controls
 */
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

/**
 * Updates navigation button states based on current screen
 */
function updateNavigation() {
  d3.select("#prev-btn").property("disabled", currentScreen === 0);

  d3.select("#next-btn").property(
    "disabled",
    currentScreen === circlePackData.length - 1,
  );

  d3.selectAll(".dot").classed("active", false);

  d3.select(`.dot:nth-child(${currentScreen + 1})`).classed("active", true);
}

/**
 * Displays tooltip with category information
 */
function showTooltip(event, d) {
  const volume = d.value.toFixed(2);
  const country = d.parent.data.name;
  const tooltipContent = `
    <strong style="color: ${colorScale(d.data.name)}">${d.data.name}</strong>
    <strong> in ${country}</strong><br/>
    USD ${volume} bi`; //1 casa decimal

  tooltip.html(tooltipContent).style("opacity", 1);

  positionTooltip(event);
}

function hideTooltip() {
  tooltip.style("opacity", 0);
}

/**
 * Positions tooltip relative to mouse cursor with collision detection
 */
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

  tooltip.style("left", left + "px").style("top", top + "px");
}
