var circleRadius = 4;

var i = 0;
var duration = 500;
var root;

var margin = 200;

var w = window.innerWidth;
var h = window.innerHeight;

var svg = d3.select("#tree")
  .append("svg")
  .attr("preserveAspectRatio", "xMinYMin meet")
  .attr("viewBox", `0 0 ${w - margin} ${h}`)
  .append("g")
  .attr("width", w + margin + margin)
  .attr("transform", "translate(" + margin + "," + 0 + ")");

var tooltip = d3.select("#tree")
  .append("p")
  .classed("tooltip", true)
  .style("opacity", 0);

var tree = d3.tree().size([h, w]);

d3.json("../data/tree.json", function(error, data) {
  if (error) throw error;

  root = d3.hierarchy(data, function(d) { return d.children; });

  root.x0 = margin;
  root.y0 = 0;

  function transform(d) {
    var name = d.data.class;
    if (d.data.rule !== undefined) {
      name = `${d.data.rule.feature}
              ${d.data.rule.operator}
              ${d.data.rule.threshold}`;
    }
    d.data.name = name;

    if (d.children) {
      d.children.forEach(transform);
    }
  }

  transform(root);

  function collapse(d) {
    if (d.children) {
      d._children = d.children;
      d._children.forEach(collapse);
      d.children = null;
    }
  }

  root.children.forEach(collapse);
  update(root);
});


/*
 * Adapted and heavily based upon the D3(v4) version of Mike Bostock"s
 * "Collapsible Tree Example".
 * https://bl.ocks.org/mbostock/4339083#flare.json
 * https://bl.ocks.org/d3noob/43a860bc0024792f8803bba8ca0d5ecd
 */
function update(source) {
  // Assigns the x and y position for the nodes
  var treeData = tree(root);

  // Compute the new tree layout.
  var nodes = treeData.descendants(),
      links = treeData.descendants().slice(1);

  // Normalize for fixed-depth.
  nodes.forEach(function(d){ d.y = d.depth * 180});

  // ****************** Nodes section ***************************

  // Update the nodes...
  var node = svg.selectAll("g.node")
    .data(nodes, function(d) {return d.id || (d.id = ++i); });

  // Enter any new nodes at the parent's previous position.
  var nodeEnter = node.enter().append("g")
    .attr("class", "node")
    .attr("transform", function(d) {
      return "translate(" + source.y0 + "," + source.x0 + ")";
    })
    .on("mouseover", showTooltip)
    .on("mouseout", hideTooltip)
    .on("click", click);

  // Add Circle for the nodes
  nodeEnter.append("circle")
    .attr("class", "node")
    .attr("r", circleRadius)
    .style("fill", function(d) {
      return d._children ? "lightsteelblue" : "#fff";
    });

  // Add labels for the nodes
  nodeEnter.append("text")
    .attr("dy", ".35em")
    .attr("x", function(d) {
      return d.children || d._children ? -13 : 13;
    })
    .attr("text-anchor", function(d) {
      return d.children || d._children ? "end" : "start";
    })
    .text(function(d) { return d.data.name; });

  // UPDATE
  var nodeUpdate = nodeEnter.merge(node);

  // Transition to the proper position for the node
  nodeUpdate.transition()
    .duration(duration)
    .attr("transform", function(d) {
      return "translate(" + d.y + "," + d.x + ")";
    });

  // Update the node attributes and style
  nodeUpdate.select("circle.node")
    .attr("r", circleRadius)
    .style("fill", function(d) {
      return d._children ? "lightsteelblue" : "#fff";
    })
    .attr("cursor", "pointer");


  // Remove any exiting nodes
  var nodeExit = node.exit().transition()
    .duration(duration)
    .attr("transform", function(d) {
      return "translate(" + source.y + "," + source.x + ")";
    })
    .remove();

  // On exit reduce the node circles size to 0
  nodeExit.select("circle")
    .attr("r", 1e-6);

  // On exit reduce the opacity of text labels
  nodeExit.select("text")
    .style("fill-opacity", 1e-6);

  // ****************** links section ***************************

  // Update the links...
  var link = svg.selectAll("path.link")
    .data(links, function(d) { return d.id; });

  // Enter any new links at the parent"s previous position.
  var linkEnter = link.enter().insert("path", "g")
    .attr("class", function (d) {
      var classes = "link";
      if (d.data.side === "left") {
        classes = classes + " " + "left";
      } else if (d.data.side === "right") {
        classes = classes + " " + "right";
      }
      return classes;
    })
    .attr("d", function(d){
      var o = {x: source.x0, y: source.y0}
      return diagonal(o, o)
    });

  // UPDATE
  var linkUpdate = linkEnter.merge(link);

  // Transition back to the parent element position
  linkUpdate.transition()
    .duration(duration)
    .attr("d", function(d){ return diagonal(d, d.parent) });

  // Remove any exiting links
  var linkExit = link.exit().transition()
    .duration(duration)
    .attr("d", function(d) {
      var o = {x: source.x, y: source.y}
      return diagonal(o, o)
    })
    .remove();

  // Store the old positions for transition.
  nodes.forEach(function(d){
    d.x0 = d.x;
    d.y0 = d.y;
  });

  // Creates a curved (diagonal) path from parent to the child nodes
  function diagonal(s, d) {
    path = `M ${s.y} ${s.x}
    C ${(s.y + d.y) / 2} ${s.x},
      ${(s.y + d.y) / 2} ${d.x},
      ${d.y} ${d.x}`
    return path
  }

  // Toggle children on click.
  function click(d) {
    if (d.children) {
      d._children = d.children;
      d.children = null;
    } else {
      d.children = d._children;
      d._children = null;
    }
    update(d);
  }

  function showTooltip(d) {
    function tooltipText(d) {
      return d.data.name || "None";
    }

    h = tooltip.node().getBoundingClientRect().height;
    tooltip
      .text(tooltipText(d))
      .style("left", (d3.event.clientX + h) + "px")
      .style("top", (d3.event.clientY - h) + "px")
      .transition()
      .duration(duration)
      .style("opacity", 0.9);
  }

  function hideTooltip(d) {
    tooltip.transition()
      .duration(duration)
      .style("opacity", 0.0);
  }
}
