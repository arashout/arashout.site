function toggleContent(element){
    const refID = element.getAttribute('data-refID');
    const refElement = document.getElementById(refID);

    toggleClass(refElement, 'hidden');

    // Toggle the dropdown icon
    const iconElement = element.getElementsByTagName('i')[0];
    const minusIconClass = 'fa-minus-square-o';
    const plusIconClass = 'fa-plus-square-o';

    if(iconElement.classList.contains(minusIconClass)){
        iconElement.classList.remove(minusIconClass);
        iconElement.classList.add(plusIconClass);
    }
    else{
        iconElement.classList.remove(plusIconClass);
        iconElement.classList.add(minusIconClass);
    }
}

function toggleClass(element, className){
    if(element.classList.contains(className)){
        element.classList.remove(className);
    }
    else{
        element.classList.add(className);
    }
};