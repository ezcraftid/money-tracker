(function () {
  var form = document.getElementById('transaction-form');
  if (!form) return;

  var typeInputs = form.querySelectorAll('input[name="type"]');
  var categorySelect = document.getElementById('transaction-category');
  if (!categorySelect) return;

  function selectedType() {
    for (var i = 0; i < typeInputs.length; i++) {
      if (typeInputs[i].checked) return typeInputs[i].value;
    }
    return 'expense';
  }

  function apply() {
    var type = selectedType();
    var options = categorySelect.options;
    var clearSelection = false;
    for (var i = 0; i < options.length; i++) {
      var option = options[i];
      var match = option.getAttribute('data-kind') === type;
      option.disabled = !match;
      option.hidden = !match;
      if (!match && option.selected) clearSelection = true;
    }
    if (clearSelection) categorySelect.selectedIndex = 0;
  }

  for (var i = 0; i < typeInputs.length; i++) {
    typeInputs[i].addEventListener('change', apply);
  }
  apply();
})();
