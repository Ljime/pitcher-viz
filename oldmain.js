const width = 500;
const height = 500;
const svg = d3.select("#chart").attr("width", width).attr("height", height);
const tooltip = d3.select("#tooltip");

d3.csv("data/pitchers.csv").then(data => {
  data.forEach(d => {
    d.plate_x = +d.plate_x;
    d.plate_z = +d.plate_z;
  });

  init(data);
});

function init(data) {
    const pitchers = [...new Set(data.map(d => d.player_name))];
    const pitchTypes = [...new Set(
    data
        .map(d => d.pitch_type)
        .filter(d => d && d.trim() !== "")
    )];

    d3.select("#pitcher-select").selectAll("option").data(pitchers).enter().append("option").text(d => d);
    d3.select("#pitch-type").selectAll("option.pitch").data(pitchTypes).enter().append("option").attr("class", "pitch").attr("value", d => d).text(d => d);
    
    const firstPitcher = pitchers[0];
    updatePitchTypeDropdown(data, firstPitcher);
    update(data);

    d3.select("#pitcher-select").on("change", () => {
        const selectedPitcher = d3.select("#pitcher-select").property("value");
        updatePitchTypeDropdown(data, selectedPitcher);
        update(data);
    });
    d3.select("#pitch-type").on("change", () => update(data));
}

function updatePitchTypeDropdown(data, selectedPitcher) {
  const filtered = data.filter(d => d.player_name === selectedPitcher);
  const pitchTypes = [...new Set(
    filtered
        .map(d => d.pitch_type)
        .filter(d => d && d.trim() !== "")
    )];
  const dropdown = d3.select("#pitch-type");

  dropdown.selectAll("option").remove();
  dropdown.append("option")
    .attr("value", "all")
    .text("All");
  dropdown.selectAll("option.pitch")
    .data(pitchTypes)
    .enter()
    .append("option")
    .attr("class", "pitch")
    .attr("value", d => d)
    .text(d => d);
}

function update(data) {
  const selectedPitcher = d3.select("#pitcher-select").property("value");
  const selectedType = d3.select("#pitch-type").property("value");

  let filtered = data.filter(d =>
    d.player_name === selectedPitcher &&
    (selectedType === "all" || d.pitch_type === selectedType)
  );

  const hits = filtered.filter(d =>
    ["single","double","triple","home_run"].includes(d.events)
  );

  svg.transition()
    .duration(200)
    .style("opacity", 0)
    .on("end", () => {
      draw(filtered, hits);
      svg.transition()
        .duration(300)
        .style("opacity", 1);
    });
}

function draw(allData, hitData) {
    svg.selectAll("*").remove();
    const legendData = [
        { label: "Non-Hits", color: "blue" },
        { label: "Walks", color: "green" },
        { label: "Singles", color: "yellow" },
        { label: "Doubles", color: "orange" },
        { label: "Home Runs", color: "red" }
    ];
    const legend = svg.append("g").attr("transform", "translate(25, 20)");
    const itemWidth = 90;
    legend.selectAll("rect").data(legendData).enter().append("rect").attr("x", (d, i) => i * itemWidth).attr("y", 0).attr("width", 15).attr("height", 15).attr("fill", d => d.color).attr("opacity", 0.7);
    legend.selectAll("text").data(legendData).enter().append("text").attr("x", (d, i) => i * itemWidth + 20).attr("y", 12).text(d => d.label).style("font-size", "12px").attr("alignment-baseline", "middle");
    const marginTop = 100;
    const x = d3.scaleLinear().domain([-2, 2]).range([50, width - 50]);
    const y = d3.scaleLinear().domain([0, 5]).range([height - 50, marginTop]);
            
    const singles = hitData.filter(d => d.events === "single");
    const doubles = hitData.filter(d => d.events === "double");
    const homers = hitData.filter(d => d.events === "home_run");
    const nonHits = allData.filter(d =>
    !["single", "double", "triple", "home_run", "walk"].includes(d.events)
    );
    const walks = allData.filter(d => d.events === "walk");

    const density = d3.contourDensity().x(d => x(d.plate_x)).y(d => y(d.plate_z)).size([width, height]).bandwidth(20);
    svg.selectAll(".nonhit-density").data(density(nonHits)).enter().append("path").attr("class", "nonhit-density").attr("d", d3.geoPath()).attr("fill", "blue").attr("opacity", 0.2);
    svg.selectAll(".walk-density").data(density(walks)).enter().append("path").attr("class", "walk-density").attr("d", d3.geoPath()).attr("fill", "green").attr("opacity", 0.4)
    .on("mouseover", function(event, d) {
        d3.select(this)
        .attr("opacity", 0.8)
        .attr("stroke", "black")
        .attr("stroke-width", 2);
        tooltip.style("opacity", 1)
        .html(`
            <strong>Walk Zone</strong><br>
            High walk probability
        `);
    })
    .on("mousemove", (event) => {
        tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px");
    })
    .on("mouseout", function() {
        d3.select(this)
        .attr("opacity", 0.4)
        .attr("stroke", "none");
        tooltip.style("opacity", 0);
    });

    svg.selectAll(".single-density").data(density(singles)).enter().append("path").attr("class", "single-density").attr("d", d3.geoPath()).attr("fill", "yellow").attr("opacity", 0.3)
    .on("mouseover", function(event, d) {
        d3.select(this)
        .attr("opacity", 0.7)
        .attr("stroke", "black")
        .attr("stroke-width", 2);
        tooltip.style("opacity", 1)
        .html(`
            <strong>Single Zone</strong><br>
            High single probability
        `);
    })
    .on("mousemove", (event) => {
        tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px");
    })
    .on("mouseout", function() {
        d3.select(this)
        .attr("opacity", 0.3)
        .attr("stroke", "none");
        tooltip.style("opacity", 0);
    });

    svg.selectAll(".double-density").data(density(doubles)).enter().append("path").attr("class", "double-density").attr("d", d3.geoPath()).attr("fill", "orange").attr("opacity", 0.4)
    .on("mouseover", function(event, d) {
        d3.select(this)
        .attr("opacity", 0.85)
        .attr("stroke", "black")
        .attr("stroke-width", 2);
        tooltip.style("opacity", 1)
        .html(`
            <strong>Double Zone</strong><br>
            High double probability
        `);
    })
    .on("mousemove", (event) => {
        tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px");
    })
    .on("mouseout", function() {
        d3.select(this)
        .attr("opacity", 0.4)
        .attr("stroke", "none");
        tooltip.style("opacity", 0);
    });

    svg.selectAll(".hr-density").data(density(homers)).enter().append("path").attr("class", "hr-density").attr("d", d3.geoPath()).attr("fill", "red").attr("opacity", 0.6)
    .on("mouseover", function(event, d) {
        d3.select(this)
        .attr("opacity", 0.9)
        .attr("stroke", "black")
        .attr("stroke-width", 2);

        tooltip.style("opacity", 1)
        .html(`
            <strong>Home Run Zone</strong><br>
            High danger area
        `);
    })
    .on("mousemove", (event) => {
        tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px");
    })
    .on("mouseout", function() {
        d3.select(this)
        .attr("opacity", 0.6)
        .attr("stroke", "none");
        tooltip.style("opacity", 0);
    });

    svg.selectAll(".all").data(allData).enter().append("circle").attr("class", "all").attr("cx", d => x(d.plate_x)).attr("cy", d => y(d.plate_z)).attr("r", 6).attr("fill", "blue").attr("opacity", 0.2).attr("pointer-events", "none");
    svg.selectAll(".hit-dots").data(hitData).enter().append("circle").attr("class", "hit-dots").attr("cx", d => x(d.plate_x)).attr("cy", d => y(d.plate_z)).attr("r", 6)
        .attr("fill", d => {
            if (d.events === "home_run") {
                return "red";
            }
            if (d.events === "double") {
                return "orange";
            }
            return "yellow";
        })
        .attr("stroke", "black")
        .attr("opacity", 0.9)
        .on("mouseover", (event, d) => {
            tooltip.style("opacity", 1)
            .html(`
                <strong>${d.player_name}</strong><br>
                Pitch: ${d.pitch_type}<br>
                Result: ${d.events}<br>
                Speed: ${d.release_speed || "N/A"} mph
            `);
        })
        .on("mousemove", (event) => {
            tooltip
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", () => {
            tooltip.style("opacity", 0);
        });

    const walkDots = allData.filter(d => d.events === "walk");
    svg.selectAll(".walk-dots").data(walkDots).enter().append("circle").attr("class", "walk-dots").attr("cx", d => x(d.plate_x)).attr("cy", d => y(d.plate_z)).attr("r", 6).attr("fill", "green").attr("stroke", "black").attr("stroke-width", 0.5)
        .attr("opacity", 0.9).on("mouseover", (event, d) => {
            tooltip.style("opacity", 1)
            .html(`
                <strong>${d.player_name}</strong><br>
                Pitch: ${d.pitch_type}<br>
                Result: ${d.events}<br>
                Speed: ${d.release_speed || "N/A"} mph
            `);
        })
        .on("mousemove", (event) => {
            tooltip
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", () => {
            tooltip.style("opacity", 0);
        });

    // Strike zone
    svg.append("rect").attr("x", x(-0.83)).attr("y", y(3.5)).attr("width", x(0.83) - x(-0.83)).attr("height", y(1.5) - y(3.5)).attr("fill", "none").attr("stroke", "black");
}