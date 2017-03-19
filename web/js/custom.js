engToGreek = {
  "a" : "α",
  "b" : "β",
  "c" : "ψ",
  "d" : "δ",
  "e" : "ε",
  "f" : "φ",
  "g" : "γ",
  "h" : "η",
  "i" : "ι",
  "j" : "ξ",
  "k" : "κ",
  "l" : "λ",
  "m" : "μ",
  "n" : "ν",
  "o" : "ο",
  "p" : "π",
  "q" : ";",
  "r" : "ρ",
  "s" : "σ",
  "t" : "τ",
  "u" : "θ",
  "v" : "ω",
  "w" : "ς",
  "x" : "χ",
  "y" : "υ",
  "z" : "ζ"
};

function translate(str) {
  var translation = '';

  for(var i = 0; i < str.length ; i++) {
    translation += engToGreek[str[i]];
  }

  return translation;
}

var loadStatusNode = document.querySelector('#load-status');

loadStatusNode.innerHTML = translate(loadStatusNode.innerHTML);

var navNodes = $('.ip-main>nav>a');

navNodes.click(function() {
  navNodes.removeClass('current-demo');

  $(this).addClass('current-demo');

  $('#content-canvas>div').css('display', 'none');
  $('#content-canvas>div[data-tab="' + $(this).text().toLowerCase() + '"]').fadeIn();
});

$('#content-canvas>div[data-tab="about"]').fadeIn();



function validateEmail(emailField){
        var reg = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/;

        if (reg.test(emailField.value) == false) 
        { $("#emailid").removeClass('trans-border');
             $("#emailid").addClass('red-border');
            
        return false;
        }
        else
  {   $("#emailid").removeClass('red-border');
    $("#emailid").addClass('trans-border');
    return true;}
          
}

