async function loadData() {
  const response = await fetch("data/findex.csv");
  const csv = await response.text();
  const lines = csv.trim().split("\n").slice(1);

  return lines.map((line) => {
    const [ref_area, ref_area_label, year2024, classification] = line.split(",");
    return {
      country: ref_area.replace(/"/g, ""),
      country_label: ref_area_label.replace(/"/g, ""),
      data: parseFloat(year2024),
      class: classification.replace(/"/g, ""),
    };
  });
}



