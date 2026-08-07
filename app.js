// Cargador seguro: conserva la aplicación original y aplica los hotfixes locales.
// app-original.js es una copia exacta del app.js previo en esta rama.
(function(){
  'use strict';

  function loadScript(src){
    return new Promise(function(resolve, reject){
      var script = document.createElement('script');
      script.src = src;
      script.defer = true;
      script.onload = resolve;
      script.onerror = function(){ reject(new Error('No se pudo cargar ' + src)); };
      document.head.appendChild(script);
    });
  }

  loadScript('app-original.js')
    .then(function(){ return loadScript('app-hotfix.js'); })
    .catch(function(error){
      console.error('Error cargando la aplicación:', error);
      var live = document.getElementById('resultados-hint');
      if(live) live.textContent = 'No se pudo cargar la aplicación. Recarga la página.';
    });
})();
