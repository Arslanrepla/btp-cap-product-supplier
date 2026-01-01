sap.ui.define(["./BaseController"], function (BaseController) {
	"use strict";

	return BaseController.extend("test.controller.Main", {
        
        onInit()
		{

		},

		onTilePress: function (oEvent) {
			const sRoute = oEvent.getSource().data("route");
			if(sRoute)
			{
				this.getOwnerComponent().getRouter().navTo(sRoute);
			}
		}
	});
});
