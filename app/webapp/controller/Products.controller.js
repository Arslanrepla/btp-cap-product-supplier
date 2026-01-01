sap.ui.define([
    "./BaseController",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter"
], function (BaseController, MessageBox, MessageToast, JSONModel, Filter, FilterOperator, Sorter) {
    "use strict";

    return BaseController.extend("test.controller.Products", {

        UPDATE_GROUP: "updateGroup",

        onInit: function () {
            this.getView().setModel(new JSONModel({
                name: "",
                description: "",
                category: "",
                price: null,
                stock: null,
                supplier_uuid: null,
                test: ""
            }), "editForm");

            this._currentDetailPath = null;
            this._prodFilter = null;
            this._prodSortKey = "name";
            this._prodSortDesc = false;

            const oRouter = this.getOwnerComponent().getRouter();
            const oRoute = oRouter?.getRoute("products");
            if (oRoute) {
                oRoute.attachPatternMatched(() => {
                    this._resetLayoutToList();
                    this._clearTableSelection();
                }, this);
            }

            this.byId("masterPageProd")?.addEventDelegate({
                onBeforeShow: () => {
                    this._resetLayoutToList();
                    this._clearTableSelection();
                }
            });

            const oTbl = this.byId("tblProducts");
            if (oTbl && oTbl.attachUpdateFinished) {
                oTbl.attachUpdateFinished(this.onTableUpdateFinished, this);
            }
        },

        // ---- Layout helper ----
        _resetLayoutToList: function () {
            const fcl = this.byId("fclProd");
            if (fcl && fcl.getLayout && fcl.getLayout() !== "OneColumn") {
                fcl.setLayout("OneColumn");
            }

            const dp = this.byId("detailPageProd");
            if (dp) {
                dp.unbindElement();
            }

            this._currentDetailPath = null;
        },

        _clearTableSelection: function () {
            const oTable = this.byId("tblProducts");
            if (!oTable) return;

            oTable.removeSelections(true);

            const aItems = oTable.getItems?.() || [];
            for (let i = 0; i < aItems.length; i++) {
                const it = aItems[i];
                if (it.getSelected && it.getSelected()) it.setSelected(false);
            }

            this.byId("btnDeleteProd")?.setEnabled(false);

            const once = (fn) => {
                const handler = function () {
                    oTable.detachUpdateFinished(handler);
                    fn();
                };
                oTable.attachUpdateFinished(handler);
            };

            once(() => {
                oTable.removeSelections(true);
                const items = oTable.getItems?.() || [];
                for (let i = 0; i < items.length; i++) {
                    const it2 = items[i];
                    if (it2.getSelected && it2.getSelected()) it2.setSelected(false);
                }
                this.byId("btnDeleteProd")?.setEnabled(false);
            });

            setTimeout(() => {
                oTable.removeSelections(true);
                const items2 = oTable.getItems?.() || [];
                for (let j = 0; j < items2.length; j++) {
                    const it3 = items2[j];
                    if (it3.getSelected && it3.getSelected()) it3.setSelected(false);
                }
                this.byId("btnDeleteProd")?.setEnabled(false);
            }, 0);
        },

        onTableUpdateFinished: function () {
            const oTable = this.byId("tblProducts");
            const hasSel = oTable.getSelectedContexts(true).length > 0;
            this.byId("btnDeleteProd").setEnabled(hasSel);
            if (hasSel) {
                this._clearTableSelection();
            }
        },

        onSelectionChange: function () {
            const hasSel = this.byId("tblProducts").getSelectedContexts(true).length > 0;
            this.byId("btnDeleteProd").setEnabled(hasSel);
        },

        onItemPress: function (oEvent) {
            const oTable = oEvent.getSource();
            const oItem = oEvent.getParameter("listItem");
            const oListB = oTable.getBinding("items");
            if (!oListB) return;

            const oModel = oListB.getModel();
            const sModelNm = oModel.sName || undefined;

            const oCtx = sModelNm ? oItem.getBindingContext(sModelNm) : oItem.getBindingContext();
            if (!oCtx) return;

            const sPath = oCtx.getPath();

            if (this._currentDetailPath === sPath && this.byId("fclProd").getLayout() !== "OneColumn") {
                this.onCloseDetail();
                return;
            }

            this.byId("detailPageProd").bindElement({
                path: (sModelNm ? (sModelNm + ">") : "") + sPath,
                parameters: {
                    $$updateGroupId: this.UPDATE_GROUP,
                    expand: "supplier"
                }
            });

            this.byId("fclProd").setLayout("TwoColumnsMidExpanded");
            this._currentDetailPath = sPath;
        },

        onCloseDetail: function () {
            this.byId("detailPageProd").unbindElement();
            this.byId("fclProd").setLayout("OneColumn");
            this._currentDetailPath = null;
        },

        onNavBack: function () {
            const fcl = this.byId("fclProd");
            if (fcl && fcl.getLayout && fcl.getLayout() !== "OneColumn") {
                this.onCloseDetail();
                return;
            }

            if (BaseController.prototype.onNavBack) {
                try {
                    BaseController.prototype.onNavBack.apply(this, arguments);
                    return;
                } catch (e) { }
            }

            if (window.history.length > 1) {
                window.history.go(-1);
            }
        },

        onDeleteSelected: function () {
            const oTable = this.byId("tblProducts");
            const aCtx = oTable.getSelectedContexts(true);
            if (!aCtx.length) return;

            this._getI18nBundle().then((oBundle) => {
                MessageBox.confirm(
                    oBundle.getText("product.bulkDelete.confirm", [aCtx.length]),
                    {
                        actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                        emphasizedAction: MessageBox.Action.OK,
                        onClose: async (act) => {
                            if (act !== MessageBox.Action.OK) return;
                            try {
                                await Promise.all(aCtx.map((ctx) => ctx.delete("$direct")));
                                MessageToast.show(oBundle.getText("product.bulkDelete.success"), {
                                    closeOnBrowserNavigation: false
                                });
                                this._clearTableSelection();
                                this.onCloseDetail();
                            } catch (e) {
                                MessageBox.error(e?.message || oBundle.getText("product.bulkDelete.failed"));
                            }
                        }
                    }
                );
            });
        },

        onEdit: function () {
            const oCtx = this.byId("detailPageProd").getBindingContext();
            if (!oCtx) {
                this._getI18nBundle().then((oBundle) => {
                    MessageToast.show(oBundle.getText("product.edit.selectOne"));
                });
                return;
            }

            const oData = oCtx.getObject();
            this.getView().getModel("editForm").setData({
                name: oData.name || "",
                description: oData.description || "",
                category: oData.category || "",
                price: oData.price ?? null,
                stock: oData.stock ?? null,
                supplier_uuid: oData.supplier_uuid || oData.supplier?.uuid || null
            });

            this.byId("editDialogProd").open();
        },

        onEditDialogCancel: function () {
            this.byId("editDialogProd").close();
        },

        onEditDialogSave: async function () {
            const oDetailCtx = this.byId("detailPageProd").getBindingContext();
            const oBundle = await this._getI18nBundle();
            if (!oDetailCtx) {
                MessageToast.show(oBundle.getText("product.edit.selectOne"));
                return;
            }

            const d = this.getView().getModel("editForm").getData();
            const oModel = oDetailCtx.getModel();

            const priceNum =
                d.price === "" || d.price === null || d.price === undefined
                    ? null
                    : Number(d.price);
            const stockNum =
                d.stock === "" || d.stock === null || d.stock === undefined
                    ? null
                    : Number(d.stock);

            try {
                oDetailCtx.setProperty("name", d.name?.trim(), this.UPDATE_GROUP);
                oDetailCtx.setProperty("description", d.description || "", this.UPDATE_GROUP);
                oDetailCtx.setProperty("category", d.category || "", this.UPDATE_GROUP);
                oDetailCtx.setProperty("price", isNaN(priceNum) ? null : priceNum, this.UPDATE_GROUP);
                oDetailCtx.setProperty("stock", isNaN(stockNum) ? null : stockNum, this.UPDATE_GROUP);
                oDetailCtx.setProperty("supplier_uuid", d.supplier_uuid || null, this.UPDATE_GROUP);

                await oModel.submitBatch(this.UPDATE_GROUP);

                const oTable = this.byId("tblProducts");
                if (oDetailCtx.requestRefresh) {
                    await oDetailCtx.requestRefresh();
                }

                const oItemsB = oTable?.getBinding("items");
                if (oItemsB) {
                    oItemsB.refresh();
                }

                const oBundle = await this._getI18nBundle();
                MessageToast.show(oBundle.getText("product.update.success"), {
                    closeOnBrowserNavigation: false
                });

                this.byId("editDialogProd").close();
            } catch (e) {
                MessageBox.error(e?.message || "Güncelleme başarısız.");
            }
        },

        _applyTableBindingUpdates: function () {
            const oTable = this.byId("tblProducts");
            const oBinding = oTable.getBinding("items");
            if (!oBinding) return;

            const aFilters = [];
            if (this._prodFilter) aFilters.push(this._prodFilter);
            oBinding.filter(aFilters);

            const oSorter = new Sorter(this._prodSortKey, this._prodSortDesc);
            oBinding.sort([oSorter]);

            this._clearTableSelection();
        },

        onSearchProducts: function (oEvent) {
            const sRaw = (oEvent.getParameter("query") || "").trim();

            if (!sRaw) {
                this._prodFilter = null;
                this._applyTableBindingUpdates();
                return;
            }

            const isNumeric = !isNaN(sRaw) && isFinite(Number(sRaw));
            const aOrGroups = [];

            aOrGroups.push(
                new Filter({
                    and: false,
                    filters: [
                        new Filter({ path: "name", operator: FilterOperator.Contains, value1: sRaw, caseSensitive: false }),
                        new Filter({ path: "category", operator: FilterOperator.Contains, value1: sRaw, caseSensitive: false })
                    ]
                })
            );

            if (isNumeric) {
                const num = Number(sRaw);
                aOrGroups.push(
                    new Filter({
                        and: false,
                        filters: [
                            new Filter("price", FilterOperator.EQ, num),
                            new Filter("stock", FilterOperator.EQ, num)
                        ]
                    })
                );
            }

            this._prodFilter = new Filter({ and: false, filters: aOrGroups });
            this._applyTableBindingUpdates();
        },

        onClearSearch: function () {
            const oSF = this.byId("prodSearch");
            if (oSF) oSF.setValue("");
            this._prodFilter = null;
            this._applyTableBindingUpdates();
        },

        onSortAsc: function () {
            const sKey = this.byId("prodSortBy").getSelectedKey() || "name";
            this._prodSortKey = sKey;
            this._prodSortDesc = false;
            this._applyTableBindingUpdates();
        },

        onSortDesc: function () {
            const sKey = this.byId("prodSortBy").getSelectedKey() || "name";
            this._prodSortKey = sKey;
            this._prodSortDesc = true;
            this._applyTableBindingUpdates();
        },

        onRowDelete: function (oEvent) {
            const oItem = oEvent.getSource().getParent();
            const oCtx = oItem.getBindingContext();
            if (!oCtx) return;

            this.getOwnerComponent().getModel("i18n").getResourceBundle().then((oBundle) => {
                MessageBox.confirm(oBundle.getText("product.delete.confirm"), {
                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                    emphasizedAction: MessageBox.Action.OK,
                    onClose: async (act) => {
                        if (act !== MessageBox.Action.OK) return;
                        try {
                            await oCtx.delete("$direct");
                            MessageToast.show(oBundle.getText("product.delete.success"), {
                                closeOnBrowserNavigation: false
                            });

                            const sPath = oCtx.getPath();
                            if (this._currentDetailPath === sPath) {
                                this.onCloseDetail();
                            }

                            this._clearTableSelection();
                        } catch (e) {
                            MessageBox.error(e?.message || oBundle.getText("product.delete.failed"));
                        }
                    }
                });
            });
        },

        _getI18nBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        }

    });
});
