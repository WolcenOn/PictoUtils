// Cargador seguro: conserva la aplicación original y aplica los hotfixes locales.
// app-original.js es una copia exacta del app.js previo en esta rama.
(function(){
  'use strict';

  var domReadyFired = document.readyState !== 'loading';
  window.addEventListener('DOMContentLoaded', function(){
    domReadyFired = true;
  }, { once: true });

  function loadScript(src){
    return new Promise(function(resolve, reject){
      var script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = function(){ reject(new Error('No se pudo cargar ' + src)); };
      document.head.appendChild(script);
    });
  }

  loadScript('app-original.js')
    .then(function(){
      // Si app-original.js llega después del DOMContentLoaded real,
      // reemitimos el evento para que sus inicializadores registrados no se pierdan.
      if(domReadyFired){
        window.dispatchEvent(new Event('DOMContentLoaded'));
      }
      return loadScript('app-hotfix.js');
    })
    .catch(function(error){
      console.error('Error cargando la aplicación:', error);
      var live = document.getElementById('resultados-hint');
      if(live) live.textContent = 'No se pudo cargar la aplicación. Recarga la página.';
    });
})();
