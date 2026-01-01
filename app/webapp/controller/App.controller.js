sap.ui.define(["./BaseController", "sap/ui/model/json/JSONModel", "sap/base/Log"], function (BaseController, JSONModel, Log) {
	"use strict";

	return BaseController.extend("test.controller.App", {

		onCollapseExpandPress() {
			const oSideNavigation = this.byId("sideNavigation"),
				bExpanded = oSideNavigation.getExpanded();

			oSideNavigation.setExpanded(!bExpanded);
		}, 

		onInit: function () {
			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
			this.getOwnerComponent().getRouter().attachRouteMatched(this._onRouteMatched, this);
		},

		_onRouteMatched: function (oEvent) {
			var oConfig = oEvent.getParameter("config");

			this.setSelectedMenuItem(oConfig.name);
		},

		setSelectedMenuItem: function (sKey) {
			this.byId("navigationList").setSelectedKey(sKey);
		},

		onItemSelect: function (oEvent) {
			var sKey = oEvent.getParameter("item").getKey();
			this.getOwnerComponent().getRouter().navTo(sKey);
		}
	});
});
