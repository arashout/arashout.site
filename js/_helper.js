function nodelistToArray(nl){
    var arr = [];
    arr.length = nl.length;
    for (var i = 0; i < nl.length; i++) {
        arr[i] = nl[i];
    }
    return arr;
}