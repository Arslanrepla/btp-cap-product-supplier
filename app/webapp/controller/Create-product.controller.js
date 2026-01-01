sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (BaseController, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return BaseController.extend("test.controller.Create-product", {

        onInit: function () {
            this.initFormValues = {
                name: "",
                description: "",
                category: "",
                price: null,
                stock: null,
                supplier_uuid: null,
                test: ""
            };

            const jsonFormValues = new JSONModel({ ...this.initFormValues });
            this.getView().setModel(jsonFormValues, "formValues");

            this.getView().setModel(new JSONModel({ clearEnabled: false }), "ui");

            this.getView().addEventDelegate({ onBeforeShow: this._resetForm.bind(this) });

            const oRouter = this.getOwnerComponent().getRouter();
            if (oRouter && oRouter.getRoute) {
                const oRoute = oRouter.getRoute("create-product");
                if (oRoute) {
                    oRoute.attachPatternMatched(() => this._resetForm(), this);
                }
            }

            jsonFormValues.attachPropertyChange(() => {
                this._recalcClearEnabled();
                this._validateFields();
            });
        },

        _resetForm: function () {
            this.getView().getModel("formValues").setData({ ...this.initFormValues });
            this.getView().getModel("ui").setProperty("/clearEnabled", false);
            this._clearValueStates();
        },

        _hasText: function (s) {
            return typeof s === "string" && s.trim().length > 0;
        },

        _isPureNumericString: function (s) {
            if (typeof s !== "string") return false;
            return /^\s*[+-]?\d+(\.\d+)?\s*$/.test(s);
        },

        _isValidNumericInput: function (v) {
            if (v === "" || v === null || v === undefined) return true;
            const n = Number(v);
            return Number.isFinite(n);
        },

        _by: function (id) {
            return this.byId(id);
        },

        _setVS: function (id, state, text) {
            const c = this._by(id);
            if (c && c.setValueState) c.setValueState(state || "None");
            if (c && c.setValueStateText) c.setValueStateText(text || "");
        },

        _clearValueStates: function () {
            [
                "productName",
                "productDesc",
                "category",
                "price",
                "stock",
                "productSupplierSelect",
                "test"
            ].forEach(id => this._setVS(id, "None", ""));
        },

        _validateFields: function () {
            const d = this.getView().getModel("formValues").getData() || {};
            let ok = true;

            if (this._hasText(d.name) && this._isPureNumericString(d.name)) {
                this._setVS("productName", "Error", "Name alanı tamamen numerik olamaz.");
                ok = false;
            } else {
                this._setVS("productName", "None", "");
            }

            if (this._hasText(d.category) && this._isPureNumericString(d.category)) {
                this._setVS("category", "Error", "Category alanı tamamen numerik olamaz.");
                ok = false;
            } else {
                this._setVS("category", "None", "");
            }

            if (this._hasText(d.description) && this._isPureNumericString(d.description)) {
                this._setVS("productDesc", "Error", "Description tamamen numerik olamaz.");
                ok = false;
            } else {
                this._setVS("productDesc", "None", "");
            }

            if (!this._isValidNumericInput(d.price)) {
                this._setVS("price", "Error", "Price sayısal olmalıdır (ör. 199.99).");
                ok = false;
            } else {
                this._setVS("price", "None", "");
            }

            if (!this._isValidNumericInput(d.stock)) {
                this._setVS("stock", "Error", "Stock sayısal olmalıdır (ör. 25).");
                ok = false;
            } else {
                this._setVS("stock", "None", "");
            }

            return ok;
        },

        _getPayload: function () {
            const d = this.getView().getModel("formValues").getData() || {};
            const toNum = (v) => (v === "" || v === null || v === undefined) ? null : Number(v);
            const price = toNum(d.price);
            const stock = toNum(d.stock);

            return {
                name: (d.name || "").trim(),
                description: d.description || "",
                category: (d.category || "").trim(),
                price: Number.isFinite(price) ? price : null,
                stock: Number.isFinite(stock) ? stock : null,
                supplier_uuid: d.supplier_uuid || null,
                test: (d.test || "").trim(),
            };
        },

        onSupplierChange: function (oEvent) {
            const key = oEvent.getSource().getSelectedKey();
            this.getView().getModel("formValues").setProperty("/supplier_uuid", key || null);
            this._recalcClearEnabled();
            this._validateFields();
        },

        onAnyFieldChange: function () {
            this._recalcClearEnabled();
            this._validateFields();
        },

        _recalcClearEnabled: function () {
            const d = this.getView().getModel("formValues").getData() || {};
            const hasValue =
                this._hasText(d.name) ||
                this._hasText(d.description) ||
                this._hasText(d.category) ||
                (d.price !== "" && this._isValidNumericInput(d.price)) ||
                (d.stock !== "" && this._isValidNumericInput(d.stock)) ||
                !!d.supplier_uuid;

            this.getView().getModel("ui").setProperty("/clearEnabled", hasValue);
        },

        onSave: async function () {
            try {
                const oModel = this.getView().getModel();
                if (!oModel.isA?.("sap.ui.model.odata.v4.ODataModel")) {
                    MessageBox.error("Default model OData V4 değil ya da bulunamadı.");
                    return;
                }

                const oBundle = await this.getOwnerComponent().getModel("i18n").getResourceBundle();

                const fieldsOk = this._validateFields();
                if (!fieldsOk) {
                    MessageBox.error(oBundle.getText("product.create.fieldsInvalid"));
                    return;
                }

                const payload = this._getPayload();

                if (!this._hasText(payload.name)) {
                    this._setVS("productName", "Error", oBundle.getText("product.create.nameRequired"));
                    MessageBox.error(oBundle.getText("product.create.nameRequired"));
                    return;
                }

                if (!payload.supplier_uuid) {
                    MessageBox.error(oBundle.getText("product.create.supplierRequired"));
                    return;
                }

                const oList = oModel.bindList("/Products", undefined, undefined, undefined, {
                    $$updateGroupId: "$direct"
                });

                const ctx = oList.create(payload, true);
                await ctx.created();

                oModel.refresh();

                MessageToast.show(oBundle.getText("product.create.success"), {
                    closeOnBrowserNavigation: false
                });

                this.getOwnerComponent().getRouter().navTo("products");

            } catch (e) {
                const oBundle = await this.getOwnerComponent().getModel("i18n").getResourceBundle();
                MessageBox.error(e?.message || oBundle.getText("product.create.failed"));
            }
        },

        onClear: function () {
            this._resetForm();
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
        }
    });
});
