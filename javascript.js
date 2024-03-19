function preLoad() {
    a1 = new Image; a1.src = 'images/pitAuto.jpg';  
    a2 = new Image; a2.src = 'images/pitJpgWb.jpg';
    a3 = new Image; a3.src = 'images/pitJpgWbFinal.jpg';
  }


  function showDidYouKnow(){
    const img = document.querySelector('img');
    const didYouKnow= document.querySelector('#didYouKnow');

   
    img.addEventListener('mouseover', function() {
      didYouKnow.style.display = 'block';
    });

    
    didYouKnow.addEventListener('mouseout', function() {
      didYouKnow.style.display = 'none';
    });

  }
 