window.onload = function () {
    unhideDivs();
}
function changeBaseURL() {
    var baseTagElement = document.getElementById("baseURL");
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
        baseTagElement.setAttribute("href", "http://127.0.0.1:57020/")
    }
    else {
        baseTagElement.setAttribute("href", "https://arashout.github.io/arashout/")
    }
    return 0;
}
function show(id) {
    document.getElementById(id).style.visibility = "visible";
}
function hide(id) {
    document.getElementById(id).style.visibility = "hidden";
}