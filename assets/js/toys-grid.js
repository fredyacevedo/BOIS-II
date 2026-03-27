const SVG_NS = "http://www.w3.org/2000/svg";
const toysGrid = document.getElementById("toys-grid");

if (toysGrid && Array.isArray(window.BOIS_TOYS)) {
    window.BOIS_TOYS.forEach((toy) => {
        const tempSvg = document.createElementNS(SVG_NS, "svg");
        tempSvg.setAttribute("xmlns", SVG_NS);
        tempSvg.style.position = "absolute";
        tempSvg.style.visibility = "hidden";

        const tempPath = document.createElementNS(SVG_NS, "path");
        tempPath.setAttribute("d", toy.path);
        tempPath.setAttribute("fill", "white");
        tempSvg.appendChild(tempPath);
        document.body.appendChild(tempSvg);

        const box = tempPath.getBBox();
        const pad = 5;
        const viewBox = [
            box.x - pad,
            box.y - pad,
            box.width + pad * 2,
            box.height + pad * 2
        ].join(" ");

        document.body.removeChild(tempSvg);

        const svg = document.createElementNS(SVG_NS, "svg");
        svg.setAttribute("viewBox", viewBox);
        svg.setAttribute("xmlns", SVG_NS);

        const path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("d", toy.path);
        path.setAttribute("fill", "white");
        svg.appendChild(path);

        const card = document.createElement("div");
        card.className = "icon-card glass-panel";
        card.appendChild(svg);

        const label = document.createElement("span");
        label.textContent = toy.id;
        card.appendChild(label);

        toysGrid.appendChild(card);
    });
}
