sap.ui.define(["./BaseController", "sap/ui/model/json/JSONModel", "sap/m/MessageToast", "sap/m/MessageBox"],
    function (BaseController, JSONModel, MessageToast, MessageBox) {
        "use strict";

        return BaseController.extend("test.controller.Create-supplier", {

            onInit: function () {
                this.initFormValues = {
                    name: "",
                    description: "",
                    address: "",
                    email: "",
                    tel: ""
                };

                const jsonFormValues = new JSONModel({ ...this.initFormValues });
                this.getView().setModel(jsonFormValues, "formValues");

                this.getView().setModel(new JSONModel({ clearEnabled: false }), "ui");

                this.getView().addEventDelegate({ onBeforeShow: this._resetForm.bind(this) });

                const oRouter = this.getOwnerComponent().getRouter();
                if (oRouter && oRouter.getRoute) {
                    const oRoute = oRouter.getRoute("create-supplier");
                    if (oRoute) oRoute.attachPatternMatched(() => this._resetForm(), this);
                }

                jsonFormValues.attachPropertyChange(() => this._recalcClearEnabled());
            },

            _resetForm: function () {
                this.getView().getModel("formValues").setData({ ...this.initFormValues });
                this.getView().getModel("ui").setProperty("/clearEnabled", false);
            },

            _hasText: function (s) {
                return typeof s === "string" && s.trim().length > 0;
            },

            _recalcClearEnabled: function () {
                const d = this.getView().getModel("formValues").getData() || {};
                const hasValue =
                    this._hasText(d.name) ||
                    this._hasText(d.description) ||
                    this._hasText(d.address) ||
                    this._hasText(d.email) ||
                    this._hasText(d.tel);

                this.getView().getModel("ui").setProperty("/clearEnabled", hasValue);
            },

            onAnyFieldChange: function () {
                this._recalcClearEnabled();
            },

            _getPayload: function () {
                const d = this.getView().getModel("formValues").getData() || {};
                return {
                    name: (d.name || "").trim(),
                    description: d.description || "",
                    address: d.address || "",
                    email: (d.email || "").trim(),
                    tel: (d.tel || "").trim()
                };
            },

            onSave: async function () {
                try {
                    const oModel = this.getView().getModel();
                    if (!oModel.isA?.("sap.ui.model.odata.v4.ODataModel")) {
                        MessageBox.error("Default model OData V4 değil ya da bulunamadı.");
                        return;
                    }

                    const payload = this._getPayload();

                    // i18n resource bundle al
                    const oBundle = await this.getOwnerComponent().getModel("i18n").getResourceBundle();

                    // Validasyonlar
                    if (!this._hasText(payload.name)) {
                        MessageBox.error(oBundle.getText("supplier.create.nameRequired"));
                        return;
                    }

                    if (this._hasText(payload.email)) {
                        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email);
                        if (!emailOk) {
                            MessageBox.error(oBundle.getText("supplier.create.emailInvalid"));
                            return;
                        }
                    }

                    if (this._hasText(payload.tel)) {
                        const telOk = /^[0-9+\s()-]+$/.test(payload.tel);
                        if (!telOk) {
                            MessageBox.error(oBundle.getText("supplier.create.telInvalid"));
                            return;
                        }
                    }

                    const oList = oModel.bindList("/Suppliers", undefined, undefined, undefined, {
                        $$updateGroupId: "$direct"
                    });

                    const ctx = oList.create(payload, true);
                    await ctx.created();

                    oModel.refresh();
                    MessageToast.show(oBundle.getText("supplier.create.success"), {
                        closeOnBrowserNavigation: false
                    });

                    this.getOwnerComponent().getRouter().navTo("suppliers");
                } catch (e) {
                    const oBundle = await this.getOwnerComponent().getModel("i18n").getResourceBundle();
                    MessageBox.error(e?.message || oBundle.getText("supplier.create.failed"));
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
                } else {
                }
            }


        });
    });
