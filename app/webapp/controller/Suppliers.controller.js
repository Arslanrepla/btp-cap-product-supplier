sap.ui.define([
    "./BaseController",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/ui/core/BusyIndicator",
    "sap/ui/core/util/File",
    "sap/ui/core/routing/History"
], function (BaseController, MessageBox, MessageToast, JSONModel, Filter, FilterOperator, Sorter, BusyIndicator, FileUtil, History) {
    "use strict";

    return BaseController.extend("test.controller.Suppliers", {

        UPDATE_GROUP: "updateGroup",

        onInit: function () {
            this.getView().setModel(new JSONModel({
                name: "",
                email: "",
                tel: "",
                address: "",
                description: ""
            }), "editForm");

            this._currentDetailPath = null;

            this._supFilter = null;
            this._sortKey = "name";
            this._sortDesc = false;

            const oRouter = this.getOwnerComponent().getRouter();
            const oRoute = oRouter?.getRoute("suppliers");
            if (oRoute) {
                oRoute.attachPatternMatched(() => {
                    this._resetLayoutToList();
                    this._clearTableSelection();
                }, this);
            }

            this.byId("masterPage")?.addEventDelegate({
                onBeforeShow: () => {
                    this._resetLayoutToList();
                    this._clearTableSelection();
                }
            });
        },

        /* ========================
         * I18N HELPERS
         * ======================== */
        _getI18nBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        _t: async function (key, aArgs) {
            try {
                const rb = await this._getI18nBundle();
                return rb.getText(key, aArgs);
            } catch (e) {
                return key;
            }
        },

        /* ========================
         * LAYOUT / SELECTION HELPERS
         * ======================== */
        _resetLayoutToList: function () {
            const fcl = this.byId("fcl");
            if (fcl && fcl.getLayout() !== "OneColumn") {
                fcl.setLayout("OneColumn");
            }

            const dp = this.byId("detailPage");
            if (dp) dp.unbindElement();
            this._currentDetailPath = null;
        },

        _clearTableSelection: function () {
            const oTable = this.byId("tblSuppliers");
            if (!oTable) return;

            oTable.removeSelections(true);

            const aItems = oTable.getItems();
            for (let i = 0; i < aItems.length; i++) {
                const item = aItems[i];
                if (item.getSelected && item.getSelected()) item.setSelected(false);
            }

            const btn = this.byId("btnDelete");
            btn && btn.setEnabled(false);

            const once = (fn) => {
                const handler = function () {
                    oTable.detachUpdateFinished(handler);
                    fn();
                };
                oTable.attachUpdateFinished(handler);
            };

            once(() => {
                oTable.removeSelections(true);
                const items = oTable.getItems();
                for (let i = 0; i < items.length; i++) {
                    const it = items[i];
                    if (it.getSelected && it.getSelected()) it.setSelected(false);
                }
                btn && btn.setEnabled(false);
            });

            setTimeout(() => {
                oTable.removeSelections(true);
                const items2 = oTable.getItems();
                for (let j = 0; j < items2.length; j++) {
                    const it2 = items2[j];
                    if (it2.getSelected && it2.getSelected()) it2.setSelected(false);
                }
                btn && btn.setEnabled(false);
            }, 0);
        },

        onTableUpdateFinished: function () {
            const oTable = this.byId("tblSuppliers");
            const hasSel = oTable.getSelectedContexts(true).length > 0;
            this.byId("btnDelete").setEnabled(hasSel);
            if (hasSel) this._clearTableSelection();
        },

        onSelectionChange: function () {
            const hasSel = this.byId("tblSuppliers").getSelectedContexts(true).length > 0;
            this.byId("btnDelete").setEnabled(hasSel);
        },


        /* ========================
         * MASTER/DETAIL NAV
         * ======================== */
        onItemPress: function (oEvent) {
            const oTable = oEvent.getSource();
            const oListB = oEvent.getParameter("listItem");
            const oListBnd = oTable.getBinding("items");
            if (!oListB) return;

            const oModel = oListBnd.getModel();
            const sModelNm = oModel.sName || undefined;

            const oCtx = sModelNm ? oListB.getBindingContext(sModelNm) : oListB.getBindingContext();
            if (!oCtx) return;

            const sPath = oCtx.getPath();

            if (this._currentDetailPath === sPath && this.byId("fcl").getLayout() !== "OneColumn") {
                this.onCloseDetail();
                return;
            }

            this.byId("detailPage").bindElement({
                path: (sModelNm ? (sModelNm + ">") : "") + sPath,
                parameters: { $$updateGroupId: this.UPDATE_GROUP } 
            });

            this.byId("fcl").setLayout("TwoColumnsMidExpanded");
            this._currentDetailPath = sPath;
        },

        onCloseDetail: function () {
            this.byId("detailPage").unbindElement();
            this.byId("fcl").setLayout("OneColumn");
            this._currentDetailPath = null;
        },

        onNavBack: function () {
            const fcl = this.byId("fcl");
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

        /* ========================
         * DELETE
         * ======================== */
        onDeleteSelected: async function () {
            const oTable = this.byId("tblSuppliers");
            const aCtx = oTable.getSelectedContexts(true);
            if (!aCtx) return;

            const sConfirm = await this._t("sup.bulkDelete.confirm", [aCtx.length]);
            const sOk = await this._t("sup.bulkDelete.success");
            const sFailed = await this._t("sup.bulkDelete.failed");

            MessageBox.confirm(sConfirm, {
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.OK,
                onClose: async (act) => {
                    if (act !== MessageBox.Action.OK) return;
                    try {
                        await Promise.all(aCtx.map((ctx) => ctx.delete("$direct")));
                        MessageToast.show(sOk, { closeOnBrowserNavigation: false });

                        this.onCloseDetail();

                        const oModel = this.getView().getModel();
                        oModel.refresh();

                        const oItemsB = oTable.getBinding("items");
                        oItemsB && oItemsB.refresh();
                        this._clearTableSelection();
                    } catch (e) {
                        MessageBox.error(e?.message || sFailed);
                    }
                }
            });
        },

        onRowDelete: async function (oEvent) {
            const oItem = oEvent.getSource().getParent();
            const oCtx = oItem.getBindingContext();
            if (!oCtx) return;

            const sConfirm = await this._t("sup.delete.confirm");
            const sOk = await this._t("sup.delete.success");
            const sFailed = await this._t("sup.delete.failed");

            MessageBox.confirm(sConfirm, {
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.OK,
                onClose: async (act) => {
                    if (act !== MessageBox.Action.OK) return;
                    try {
                        await oCtx.delete("$direct");
                        MessageToast.show(sOk, { closeOnBrowserNavigation: false });

                        if (this._currentDetailPath === oCtx.getPath()) {
                            this.onCloseDetail();
                        }

                        const oModel = this.getView().getModel();
                        oModel.refresh();

                        const oItemsB = this.byId("tblSuppliers").getBinding("items");
                        oItemsB && oItemsB.refresh();

                        this._clearTableSelection();
                    } catch (e) {
                        MessageBox.error(e?.message || sFailed);
                    }
                }
            });
        },

        /* ========================
         * EDIT DIALOG
         * ======================== */
        onEdit: async function () {
            const oCtx = this.byId("detailPage").getBindingContext();
            if (!oCtx) {
                const sMsg = await this._t("sup.edit.selectOne");
                MessageToast.show(sMsg);
                return;
            }

            const oData = oCtx.getObject();
            this.getView().getModel("editForm").setData({
                name: oData.name || "",
                email: oData.email || "",
                tel: oData.tel || "",
                address: oData.address || "",
                description: oData.description || ""
            });

            this.byId("editDialog").open();
        },

        onEditDialogCancel: function () {
            this.byId("editDialog").close();
        },

        onEditDialogAfterClose: function () {
            this.getView().getModel("editForm").setData({
                name: "",
                email: "",
                tel: "",
                address: "",
                description: ""
            });
        },

        onEditDialogSave: async function () {
            const oDetailCtx = this.byId("detailPage").getBindingContext();
            if (!oDetailCtx) {
                const sMsg = await this._t("sup.edit.selectOne");
                MessageToast.show(sMsg);
                return;
            }

            const d = this.getView().getModel("editForm").getData();
            const oModel = oDetailCtx.getModel();

            const sOk = await this._t("sup.update.success");
            const sFailed = await this._t("sup.update.failed");

            try {
                oDetailCtx.setProperty("name", d.name?.trim() || "", this.UPDATE_GROUP);
                oDetailCtx.setProperty("email", d.email || "", this.UPDATE_GROUP);
                oDetailCtx.setProperty("tel", d.tel || "", this.UPDATE_GROUP);
                oDetailCtx.setProperty("address", d.address || "", this.UPDATE_GROUP);
                oDetailCtx.setProperty("description", d.description || "", this.UPDATE_GROUP);

                await oModel.submitBatch(this.UPDATE_GROUP);

                if (oDetailCtx.requestRefresh) await oDetailCtx.requestRefresh();
                const oItemsB = this.byId("tblSuppliers").getBinding("items");
                oItemsB && oItemsB.refresh();

                const oGlobalModel = this.getView().getModel();
                oGlobalModel.refresh();

                MessageToast.show(sOk, { closeOnBrowserNavigation: false });
                this.byId("editDialog").close();
                this._clearTableSelection();
            } catch (e) {
                MessageBox.error(e?.message || sFailed);
            }
        },

        /* ========================
         * SEARCH & SORT
         * ======================== */
        _applyTableBindingUpdates: function () {
            const oTable = this.byId("tblSuppliers");
            const oBinding = oTable.getBinding("items");
            if (!oBinding) return;

            const aFilters = [];
            if (this._supFilter) aFilters.push(this._supFilter);
            oBinding.filter(aFilters);

            const oSorter = new Sorter(this._supSortKey, this._supSortDesc);
            oBinding.sort([oSorter]);

            this._clearTableSelection();
        },

        onSearchSuppliers: function (oEvent) {
            const sRaw = (oEvent.getParameter("query") || "").trim();

            if (!sRaw) {
                this._supFilter = null;
                this._applyTableBindingUpdates();
                return;
            }

            this._supFilter = new Filter({
                and: false,
                filters: [
                    new Filter({ path: "name", operator: FilterOperator.Contains, value1: sRaw, caseSensitive: false }),
                    new Filter({ path: "email", operator: FilterOperator.Contains, value1: sRaw, caseSensitive: false }),
                    new Filter({ path: "address", operator: FilterOperator.Contains, value1: sRaw, caseSensitive: false }),
                    new Filter({ path: "tel", operator: FilterOperator.Contains, value1: sRaw, caseSensitive: false }),
                    new Filter({ path: "description", operator: FilterOperator.Contains, value1: sRaw, caseSensitive: false })
                ]
            });

            this._applyTableBindingUpdates();
        },

        onSortAsc: function () {
            const sKey = this.byId("supSortBy").getSelectedKey() || "name";
            this._supSortKey = sKey;
            this._supSortDesc = false;
            this._applyTableBindingUpdates();
        },

        onSortDesc: function () {
            const sKey = this.byId("supSortBy").getSelectedKey() || "name";
            this._supSortKey = sKey;
            this._supSortDesc = true;
            this._applyTableBindingUpdates();
        },

        /* ========================
         * EXPORT
         * ======================== */

        onExportCSV: async function () {
            try {
                const oTable = this.byId("tblSuppliers");
                const aSelCtx = oTable.getSelectedContexts(true);
                const oBinding = oTable.getBinding("items");

                let aObjects = [];
                if (aSelCtx && aSelCtx.length) {
                    aObjects = aSelCtx.map(c => c.getObject());
                } else if (oBinding) {
                    const iLen = oBinding.getLength();
                    const aCtx = oBinding.getContexts(0, iLen);
                    aObjects = aCtx.map(c => c.getObject());
                }

                if (!aObjects.length) {
                    const sNoData = await this._t("common.nodata");
                    MessageToast.show(sNoData);
                    return;
                }

                const aHeaders = ["name", "email", "tel", "address", "description"];
                const csvEscape = (s) => {
                    if (s == null) return "";
                    const str = String(s);
                    const escaped = str.replace(/"/g, '""');
                    return /[",\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
                };

                const aLines = [];
                aLines.push(aHeaders.join(","));
                aObjects.forEach(o => {
                    aLines.push(aHeaders.map(h => csvEscape(o[h])).join(","));
                });

                const sCSV = "\uFEFF" + aLines.join("\r\n");
                FileUtil.save(sCSV, "suppliers", "csv", "text/csv;charset=utf-8");

                MessageToast.show(await this._t("common.exportDone"), {
                    closeOnBrowserNavigation: false
                });
            } catch (e) {
                const sErr = await this._t("common.exportFailed");
                MessageBox.error(e.message || sErr);

            }
        },

        _ensureHiddenFileUploader: function () {
            const fu = this.byId("fuCsv");
            if (!fu) return null;

            if (!fu.getDomRef()) {
                fu.setVisible(true);
                fu.addStyleClass("sapUiHidden");
                sap.ui.getCore().applyChanges();
            }
            return fu;
        },

        onImportCSV: function () {
            const fu = this._ensureHiddenFileUploader();
            if (!fu) return;

            sap.ui.getCore().applyChanges();

            const input =
                document.getElementById(fu.getId() + "-fu") ||
                (fu.getDomRef() && fu.getDomRef().querySelector("input[type='file']"));

            if (input && typeof input.click === "function") {
                input.click();
            } else {
                const ref = fu.getFocusDomRef();
                ref && ref.click && ref.click();
            }
        },

        onCsvSelected: function (oEvent) {
            const aFiles = oEvent.getParameter("files");
            const fu = this.byId("fuCsv");
            if (!aFiles || !aFiles.length) return;

            const file = aFiles[0];

            const ensureT = (key, args) => this._t(key, args);

            if (!file.name.toLowerCase().endsWith(".csv")) {
                ensureT("csv.selectCsv").then((sWarn) => {
                    MessageBox.warning(sWarn);
                    fu && fu.setValue("");
                });
                return;
            }

            const oTable = this.byId("tblSuppliers");
            const oBinding = oTable.getBinding("items");
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    BusyIndicator.show(0);

                    const text = e.target.result;
                    const aRows = this._parseCSV(text);

                    const aRequired = ["name", "email", "tel", "address", "description"];
                    const missing = aRequired.filter(h => !aRows.header.includes(h));
                    if (missing.length) {
                        const rb = await this._getI18nBundle();
                        throw new Error(
                            rb.getText("csv.header.missing", [missing.join(", ")]) + "\n" +
                            rb.getText("csv.header.expected", [aRequired.join(", ")])
                        );
                    }

                    let successCount = 0;
                    let errorCount = 0;

                    for (const r of aRows.rows) {
                        const payload = {
                            name: (r.name || "").trim(),
                            email: (r.email || "").trim(),
                            tel: (r.tel || "").trim(),
                            address: r.address || "",
                            description: r.description || ""
                        };

                        if (!payload.name) {
                            errorCount++;
                            continue;
                        }

                        try {
                            const oCtxx = oBinding.create(payload);
                            await oCtxx.created();
                            successCount++;
                        } catch (_) {
                            errorCount++;
                        }
                    }

                    BusyIndicator.hide();

                    const rb = await this._getI18nBundle();
                    MessageBox.information(
                        rb.getText("csv.import.summary", [successCount, errorCount])
                    );

                    try {
                        oBinding.refresh();
                    } catch (err) { }
                }
                catch (err) {
                    BusyIndicator.hide();
                    const sErr = await this._t("csv.import.failed");
                    MessageBox.error(err.message || sErr);
                } finally {
                    fu && fu.setValue("");
                }
            };

            reader.onerror = async () => {
                const sErr = await this._t("csv.read.failed");
                MessageBox.error(sErr);
                fu && fu.setValue("");
            };

            reader.readAsText(file, "utf-8");
        },

        _parseCSV: function (text) {
            const rows = [];
            let cur = [];
            let field = "";
            let inQuotes = false;

            const pushField = () => { cur.push(field); field = ""; };
            const pushRow = () => { rows.push(cur); cur = []; };

            for (let i = 0; i < text.length; i++) {
                const ch = text[i];

                if (inQuotes) {
                    if (ch === '"') {
                        if (text[i + 1] === '"') { field += '"'; i++; }
                        else inQuotes = false;
                    } else {
                        field += ch;
                    }
                } else {
                    if (ch === '"') inQuotes = true;
                    else if (ch === ",") pushField();
                    else if (ch === "\r") { }
                    else if (ch === "\n") { pushField(); pushRow(); }
                    else field += ch;
                }
            }

            pushField();
            if (cur.length > 1 || (cur.length === 1 && cur[0] !== "")) pushRow();

            if (!rows.length) return { header: [], rows: [] };

            rows[0][0] = rows[0][0].replace(/^\uFEFF/, "");

            const header = rows[0].map(h => h.trim());
            const dataRows = rows.slice(1).map(r => {
                const obj = {};
                header.forEach((h, idx) => obj[h] = (r[idx] || "").trim());
                return obj;
            });

            return { header, rows: dataRows };
        }
    });
});
