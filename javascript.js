function preLoad() {
    a1 = new Image; a1.src = 'images/pitAuto.jpg';  
    a2 = new Image; a2.src = 'images/pitJpgWb.jpg';
    a3 = new Image; a3.src = 'images/pitJpgWbFinal.jpg';
  }


  function showDidYouKnow(){
    const img = document.querySelector('img');
    const weetje = document.querySelector('#weetje');

   
    img.addEventListener('mouseover', function() {
        weetje.style.display = 'block';
    });

    
    weetje.addEventListener('mouseout', function() {
        weetje.style.display = 'none';
    });

  }
 