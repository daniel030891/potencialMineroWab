define(['dojo/_base/declare', 'jimu/BaseWidget', 'esri/request', "esri/tasks/Geoprocessor", "esri/layers/ImageParameters", "esri/tasks/JobInfo", "esri/graphicsUtils", "esri/geometry/Extent", 'jimu/dijit/Message', "dojo/dom-class", 'dojo/_base/lang', 'dojo/dom-attr', 'dojo/Deferred', 'dojo/on', 'dojo/query', 'dojo', 'dojo/dom'], function (declare, BaseWidget, esriRequest, Geoprocessor, ImageParameters, JobInfo, graphicsUtils, Extent, Message, domClass, lang, domAttr, Deferred, on, query, dojo, dom) {
  //To create a widget, you need to derive from BaseWidget.
  return declare([BaseWidget], {

    // Custom widget code goes here

    baseClass: 'potencial-minero',
    // this property is set by the framework when widget is loaded.
    // name: 'potencialMinero',
    // add additional properties here
    //methods to communication with app container:

    postCreate: function postCreate() {
      this.inherited(arguments);
      self = this;
      console.log('potencialMinero::postCreate');
    },

    // startup: function() {
    //   this.inherited(arguments);
    //   console.log('potencialMinero::startup');
    // },

    onOpen: function onOpen() {
      var panel = this.getPanel();
      panel.position.height = 660;
      panel.setPosition(panel.position);
      panel.panelManager.normalizePanel(panel);
      console.log('potencialMinero::onOpen');
      on(dojo.byId("information"), "click", self._information);
      on(dojo.byId("pixel"), "click", self._information);
    },

    // onClose: function(){
    //   console.log('potencialMinero::onClose');
    // },

    // onMinimize: function(){
    //   console.log('potencialMinero::onMinimize');
    // },

    // onMaximize: function(){
    //   console.log('potencialMinero::onMaximize');
    // },

    // onSignIn: function(credential){
    //   console.log('potencialMinero::onSignIn', credential);
    // },

    // onSignOut: function(){
    //   console.log('potencialMinero::onSignOut');
    // }

    // onPositionChange: function(){
    //   console.log('potencialMinero::onPositionChange');
    // },

    // resize: function(){
    //   console.log('potencialMinero::resize');
    // }

    //methods to communication between widgets:
    _onUpload: function _onUpload() {
      dojo.byId('runProcess').className = "button";
      dojo.query(".contentLoader").style("display", "block");
      if (!domAttr.get(self.fileInput, 'value')) {
        return;
      }
      self._doUpload().then(lang.hitch(self, function (success) {
        if (success) {
          new Message({ message: self.nls.lblSuccessProcess });
        }
      }), function (error) {
        var message = error.message || error;
        new Message({ message: message });
      });
    },

    _doUpload: function _doUpload() {
      var def = new Deferred();
      var fileName = domAttr.get(self.fileInput, 'value');
      fileName = fileName.replace(/\\/g, '/');
      fileName = fileName.substr(fileName.lastIndexOf('/') + 1);
      esriRequest({
        url: self.config.serviceUrl + 'uploads/upload',
        content: { f: "pjson" },
        form: dojo.byId('uploadForm'),
        handleAs: 'json'
      }).then(lang.hitch(self, function (data) {
        if (data.success) {
          self.itemIDInput = data.item.itemID;
          domAttr.set(self.fileInput, 'value', '');
        }
        def.resolve(data.success);
        dojo.byId('estado').innerHTML = fileName;
        dojo.query(".contentLoader").style("display", "none");
      }), function (error) {
        def.reject(error);
        dojo.query(".contentLoader").style("display", "none");
      });
      return def;
    },

    _removeLayer: function _removeLayer() {
      var layerPm = _viewerMap.getLayer("PotencialMinero");
      if (layerPm) {
        _viewerMap.removeLayer(layerPm);
      }
    },

    _runProcess: function _runProcess() {
      dojo.byId('runProcess').className = "button";
      self._removeLayer();
      dojo.query(".statusGp").style("display", "none");
      dojo.query(".statusError").style("display", "none");
      dojo.query(".my-legend").style("display", "none");
      dojo.query(".contentLoader2").style("display", "block");
      var cellsize = dojo.byId("cellsize").value;
      var gp = new Geoprocessor(self.config.serviceUrlFull);
      if (dojo.byId('estado').innerHTML == "demo") {
        var params = { 'Cargar_variables_cartográficas': "", 'Tamaño_del_pixel': cellsize };
      } else {
        var params = { 'Cargar_variables_cartográficas': "{'itemID':" + self.itemIDInput + "}", 'Tamaño_del_pixel': cellsize };
      }

      function statusCallback(JobInfo) {
        console.log(JobInfo.jobStatus);
      }

      function completeCallback(JobInfo) {
        console.log(JobInfo.jobId);
        if (JobInfo.jobStatus == "esriJobFailed") {
          dojo.query(".contentLoader2").style("display", "none");
          dojo.query(".statusGp").style("display", "none");
          dojo.query(".my-legend").style("display", "none");
          dojo.query(".statusError").style("display", "block");
        } else {
          dojo.query(".contentLoader2").style("display", "none");
          dojo.query(".my-legend").style("display", "block");
          dojo.query(".statusGp").style("display", "block");
          gp.getResultData(JobInfo.jobId, "pathoutput", self._downloadFile);
          gp.getResultData(JobInfo.jobId, "extent", self._setExtent);
          var imageParams = new esri.layers.ImageParameters();
          imageParams.imageSpatialReference = _viewerMap.spatialReference;
          gp.getResultImageLayer(JobInfo.jobId, "output", imageParams, function (gpLayer) {
            gpLayer.id = "PotencialMinero";
            gpLayer.name = "Potencial Minero";
            _viewerMap.addLayer(gpLayer);
          });
        }
      }
      gp.submitJob(params, completeCallback, statusCallback);
    },

    _downloadFile: function _downloadFile(outputFile) {
      var url = outputFile.value.url;
      domAttr.set(self.download, 'href', url);
      console.log(url);
    },

    _setExtent: function _setExtent(outputFile) {
      var extent = new esri.geometry.Extent({
        "xmin": outputFile.value.xmin,
        "ymin": outputFile.value.ymin,
        "xmax": outputFile.value.xmax,
        "ymax": outputFile.value.ymax,
        "spatialReference": { "wkid": 4326 }
      });
      _viewerMap.setExtent(extent, true);
    },

    _exeDemo: function _exeDemo() {
      dojo.byId('estado').innerHTML = "demo";
      dojo.byId('runProcess').className = "button-pulse";
    },

    _information: function _information() {
      this.classList.toggle("active");
      var panel = this.nextElementSibling;
      if (panel.style.maxHeight) {
        panel.style.maxHeight = null;
      } else {
        panel.style.maxHeight = panel.scrollHeight + "px";
      }
    }
  });
});
