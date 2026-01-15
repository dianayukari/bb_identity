
const container_mex = d3.select(".container_mex");

d3.csv("pay_profile_mex.csv", (d) => ({
 
    vertical: d.merchant_vertical_commercial,
    method: d.metodo_de_pagamento_ajustado,
    value: +d.value * 100,
    type: d.type,

})).then((loadedData) => {

    data_ebanx = loadedData.filter((d) => d.type == "pct_tpv_ebanx_b2b");
    data_market = loadedData.filter((d) => d.type == "market_average");
    initChartMex();

});

function initChartMex() {
  const groupedEbanx = d3.group(data_ebanx, (d) => d.vertical);
  const groupedMarket = d3.group(data_market, (d) => d.vertical);

  const verticals = Array.from(groupedEbanx, ([vertical, methods]) => ({
    vertical: vertical,
    methods: methods.sort((a, b) => b.value - a.value),
    marketData: groupedMarket.get(vertical) || []
  }));

  verticals.forEach((verticalData, index) => {
    createBarChart(verticalData, index, container_mex);
  });
}
