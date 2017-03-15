window.onload = function () {
    var hiddenDivs = document.getElementsByClassName('hidden');
    var arrDivs = nodelistToArray(hiddenDivs);
    arrDivs.reverse();
    for(var i = arrDivs.length - 1; i >= 0; i--){
        arrDivs[i].classList.remove("hidden");
    }
}
function nodelistToArray(nl){
    var arr = [];
    arr.length = nl.length;
    for (var i = 0; i < nl.length; i++) {
        arr[i] = nl[i];
    }
    return arr;
}