import { ajax } from "discourse/lib/ajax";
import { default as PrettyText, buildOptions } from "pretty-text/pretty-text";
import Group from "discourse/models/group";
import EmberObject, { observer } from "@ember/object";
import { A } from "@ember/array";
import ArrayProxy from "@ember/array/proxy";
import { htmlSafe } from "@ember/template";
import { getURLWithCDN } from "discourse-common/lib/get-url";

const StaticPage = EmberObject.extend({
  init: function () {
    this._super(...arguments);
  },
});

function getOpts() {
  const siteSettings = Discourse.__container__.lookup("site-settings:main");

  return buildOptions({
    getURL: getURLWithCDN,
    currentUser: Discourse.__container__.lookup("current-user:main"),
    siteSettings,
  });
}

const StaticPages = ArrayProxy.extend({
  loading: true,
  selectedItemChanged: observer("selectedItem", function () {
    const selected = this.get("selectedItem");
    (this.get("content") || []).forEach((i) =>
      i.set("selected", selected === i)
    );
  }),
});

StaticPage.reopenClass({
  findAll: function () {
    const model = StaticPages.create({ content: A(), loading: true });
    ajax("/procourse-static-pages/admin/pages.json").then((rows) => {
      (rows || []).forEach((row) => {
        let src = row;
        if (row && typeof row.value === "string") {
          try {
            src = JSON.parse(row.value);
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error("[static-pages] bad JSON in row.value:", row, e);
            src = null;
          }
        } else if (row && row.value && typeof row.value === "object") {
          // already an object under value
          src = row.value;
        }
        if (src) {
          model.pushObject(
            StaticPage.create({
              ...src,
              id: src.id != null ? Number(src.id) : src.id,
            }) // avoid sometimes numbers and sometimes strings
          );
        }
      });
      model.set("loading", false);
    });
    return model;
  },

  save: function (object, enabledOnly = false) {
    if (object.get("disableSave")) return;

    object.set("savingStatus", I18n.t("saving"));
    object.set("saving", true);

    var data = { active: object.active };

    if (object.id) {
      data.id = object.id;
    }

    if (!object || !enabledOnly) {
      let cookedStr = "";
      if (!object.html) {
        const cooked = htmlSafe(
          new PrettyText(getOpts()).cook(object.raw || "")
        );
        cookedStr = cooked && cooked.string ? cooked.string : "";
      }
      data = {
        ...data,
        title: object.title,
        slug: object.slug,
        group: object.group,
        raw: object.raw,
        cooked: cookedStr,
        custom_slug: object.custom_slug,
        html: object.html,
        html_content: object.html_content,
      };
    }

    return ajax("/procourse-static-pages/admin/pages.json", {
      data: JSON.stringify({ page: data }),
      type: object.id ? "PUT" : "POST",
      dataType: "json",
      contentType: "application/json",
    })
      .catch(function (result) {
        if (
          result.jqXHR.responseJSON &&
          result.jqXHR.responseJSON.errors &&
          result.jqXHR.responseJSON.errors[0]
        ) {
          return bootbox.alert(result.jqXHR.responseJSON.errors[0]);
        }
      })
      .then(function (result) {
        if (result.id) {
          object.set("id", result.id);
          object.set("savingStatus", I18n.t("saved"));
          object.set("saving", false);
        }
      });
  },

  copy: function (object) {
    var copiedPage = StaticPage.create({
      ...object,
      id: null,
    });
    return copiedPage;
  },

  destroy: function (object) {
    if (object.id) {
      var data = { id: object.id };
      return ajax("/procourse-static-pages/admin/pages.json", {
        data: JSON.stringify({ page: data }),
        type: "DELETE",
        dataType: "json",
        contentType: "application/json",
      });
    }
  },

  customGroups: function () {
    return Group.findAll().then((groups) => {
      return groups.filter((g) => !g.get("automatic"));
    });
  },
});

export default StaticPage;
