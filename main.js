const width = 1000;
const height = 1000;
const pitchNameMap = {
    FF: "Four-Seam Fastball",
    FT: "Two-Seam Fastball",
    SI: "Sinker",
    FC: "Cutter",
    SL: "Slider",
    CH: "Changeup",
    CU: "Curveball",
    KC: "Knuckle Curve",
    FS: "Splitter",
    EP: "Eephus",
    KN: "Knuckleball"
};

PitchVis = function(_parentElement, _data) {
    this.parentElement = _parentElement;
    this.data = _data;
    this.initVis();
};

PitchVis.prototype.initVis = function() {
    let vis = this;

    vis.svg = d3.select("#chart")
        .attr("width", width)
        .attr("height", height);

    vis.tooltip = d3.select("#tooltip");

    vis.pitchers = [...new Set(vis.data.map(d => d.player_name))];
    vis.pitchTypes = [...new Set(
        vis.data
            .map(d => d.pitch_type)
            .filter(d => d && d.trim() !== "")
    )];

    d3.select("#pitcher-select").selectAll("option").data(vis.pitchers).enter().append("option").text(d => d);

    d3.select("#pitch-type").selectAll("option.pitch").data(vis.pitchTypes).enter().append("option").attr("class", "pitch").attr("value", d => d).text(d => pitchNameMap[d] || d);

    let firstPitcher = vis.pitchers[0];
    vis.updatePitchTypeDropdown(firstPitcher);
    vis.wrangleData();

    d3.select("#pitcher-select").on("change", () => {
        let selectedPitcher = d3.select("#pitcher-select").property("value");
        vis.updatePitchTypeDropdown(selectedPitcher);
        vis.wrangleData();
    });

    d3.select("#pitch-type").on("change", () => vis.wrangleData());
};

PitchVis.prototype.updatePitchTypeDropdown = function(selectedPitcher) {
    let vis = this;

    let filtered = vis.data.filter(d => d.player_name === selectedPitcher);

    let pitchTypes = [...new Set(
        filtered
            .map(d => d.pitch_type)
            .filter(d => d && d.trim() !== "")
    )];

    let dropdown = d3.select("#pitch-type");

    dropdown.selectAll("option").remove();

    dropdown.append("option").attr("value", "all").text("All");

    dropdown.selectAll("option.pitch").data(pitchTypes).enter().append("option").attr("class", "pitch").attr("value", d => d).text(d => pitchNameMap[d] || d);
};

PitchVis.prototype.wrangleData = function() {
    let vis = this;

    let selectedPitcher = d3.select("#pitcher-select").property("value");
    let selectedType = d3.select("#pitch-type").property("value");

    vis.filtered = vis.data.filter(d =>
        d.player_name === selectedPitcher &&
        (selectedType === "all" || d.pitch_type === selectedType)
    );

    vis.hits = vis.filtered.filter(d =>
        ["single","double","triple","home_run"].includes(d.events)
    );

    vis.svg.transition()
        .duration(200)
        .style("opacity", 0)
        .on("end", () => {
            vis.updateVis();
            vis.svg.transition()
                .duration(300)
                .style("opacity", 1);
        });
};

PitchVis.prototype.updateVis = function() {
    let vis = this;
    vis.svg.selectAll("*").remove();

    let legendData = [
        { label: "Non-Hits", color: "blue" },
        { label: "Walks", color: "green" },
        { label: "Singles", color: "yellow" },
        { label: "Doubles", color: "orange" },
        { label: "Home Runs", color: "red" }
    ];

    const labelWidth = 140;
    const legendWidth = legendData.length * labelWidth;
    const legend = vis.svg.append("g").attr("transform", `translate(${(width - legendWidth) / 2}, 25)`);
    legend.selectAll("rect").data(legendData).enter().append("rect").attr("x", (_, i) => i * labelWidth).attr("y", 0).attr("width", 20).attr("height", 20).attr("fill", d => d.color).attr("opacity", 0.8);
    legend.selectAll("text").data(legendData).enter().append("text").attr("x", (_, i) => i * labelWidth + 30).attr("y", 15).text(d => d.label).style("font-size", "16px").attr("alignment-baseline", "middle");
        
    let marginTop = 100;
    const padding = 0;
    let x = d3.scaleLinear().domain([-2, 2]).range([50 + padding, width - 50 - padding]);
    let y = d3.scaleLinear().domain([0, 5]).range([height - 50 - padding, marginTop + padding]);

    let singles = vis.hits.filter(d => d.events === "single");
    let doubles = vis.hits.filter(d => d.events === "double");
    let homers = vis.hits.filter(d => d.events === "home_run");

    let nonHits = vis.filtered.filter(d =>
        !["single", "double", "triple", "home_run", "walk"].includes(d.events)
    );

    let walks = vis.filtered.filter(d => d.events === "walk");

    let density = d3.contourDensity().x(d => x(d.plate_x)).y(d => y(d.plate_z)).size([width , height]).bandwidth(20);

    vis.svg.selectAll(".nonhit-density").data(density(nonHits)).enter().append("path").attr("class", "nonhit-density").attr("d", d3.geoPath()).attr("fill", "blue").attr("opacity", 0.2);
    vis.svg.selectAll(".walk-density").data(density(walks)).enter().append("path").attr("class", "walk-density").attr("d", d3.geoPath()).attr("fill", "green").attr("opacity", 0.4)
        .on("mouseover", function(event, d) {
            d3.select(this)
                .attr("opacity", 0.8)
                .attr("stroke", "black")
                .attr("stroke-width", 2);

            vis.tooltip.style("opacity", 1)
                .html(`
                    <strong>Walk Zone</strong><br>
                    High walk probability
                `);
        })
        .on("mousemove", (event) => {
            vis.tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
                .attr("opacity", 0.4)
                .attr("stroke", "none");

            vis.tooltip.style("opacity", 0);
        });
    vis.svg.selectAll(".single-density").data(density(singles)).enter().append("path").attr("class", "single-density").attr("d", d3.geoPath()).attr("fill", "yellow").attr("opacity", 0.3)
        .on("mouseover", function(event, d) {
            d3.select(this)
                .attr("opacity", 0.7)
                .attr("stroke", "black")
                .attr("stroke-width", 2);

            vis.tooltip.style("opacity", 1)
                .html(`<strong>Single Zone</strong><br>High single probability`);
        })
        .on("mousemove", (event) => {
            vis.tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
                .attr("opacity", 0.3)
                .attr("stroke", "none");

            vis.tooltip.style("opacity", 0);
        });

    vis.svg.selectAll(".double-density").data(density(doubles)).enter().append("path").attr("class", "double-density").attr("d", d3.geoPath()).attr("fill", "orange").attr("opacity", 0.4)
        .on("mouseover", function(event, d) {
            d3.select(this)
                .attr("opacity", 0.85)
                .attr("stroke", "black")
                .attr("stroke-width", 2);

            vis.tooltip.style("opacity", 1)
                .html(`<strong>Double Zone</strong><br>High double probability`);
        })
        .on("mousemove", (event) => {
            vis.tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
                .attr("opacity", 0.4)
                .attr("stroke", "none");

            vis.tooltip.style("opacity", 0);
        });

    vis.svg.selectAll(".hr-density").data(density(homers)).enter().append("path").attr("class", "hr-density").attr("d", d3.geoPath()).attr("fill", "red").attr("opacity", 0.6)
        .on("mouseover", function(e, d) {
            d3.select(this)
                .attr("opacity", 0.9)
                .attr("stroke", "black")
                .attr("stroke-width", 2);

            vis.tooltip.style("opacity", 1)
                .html(`<strong>Home Run Zone</strong><br>High danger area`);
        })
        .on("mousemove", (event) => {
            vis.tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
                .attr("opacity", 0.6)
                .attr("stroke", "none");

            vis.tooltip.style("opacity", 0);
        });

    vis.svg.selectAll(".hit-dots").data(vis.hits).enter().append("circle").attr("class", "hit-dots").attr("cx", d => x(d.plate_x)).attr("cy", d => y(d.plate_z)).attr("r", 6)
        .attr("fill", d => {
            if (d.events === "home_run") {
                return "red";
            }
            if (d.events === "double") {
                return "orange";
            }
            return "yellow";
        }).attr("stroke", "black").attr("opacity", 0.9)
        .on("mouseover", (e, d) => {
            vis.tooltip.style("opacity", 1)
                .html(`
                    <strong>${d.player_name}</strong><br>
                    Pitch: ${d.pitch_type}<br>
                    Result: ${d.events}<br>
                    Speed: ${d.release_speed || "N/A"} mph
                `);
        })
        .on("mousemove", (event) => {
            vis.tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", () => {
            vis.tooltip.style("opacity", 0);
    });

    vis.svg.selectAll(".all").data(vis.filtered).enter().append("circle").attr("cx", d => x(d.plate_x)).attr("cy", d => y(d.plate_z)).attr("r", 6).attr("fill", "blue").attr("opacity", 0.2).attr("pointer-events", "none");
    vis.svg.append("rect").attr("x", x(-0.83)).attr("y", y(3.5)).attr("width", x(0.83) - x(-0.83)).attr("height", y(1.5) - y(3.5)).attr("fill", "none").attr("stroke", "black");
};

d3.csv("data/pitchers.csv").then(data => {
    data.forEach(d => {
        d.plate_x = +d.plate_x;
        d.plate_z = +d.plate_z;
    });

    new PitchVis("#chart", data);
});