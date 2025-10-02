import Page from "../models/page";
import Controller from "@ember/controller";
import EmberObject, { observer, computed } from "@ember/object";
import { service } from "@ember/service";
import { action } from "@ember/object";

export default Controller.extend({
  init() {
    this._super(...arguments);
    // Handlers for template usage
    this.onSelectPCPage = (page) => this.send("selectPCPage", page);
    this.onNewPCPage = () => this.send("newPCPage");
    this.onSave = () => this.send("save");
    this.onToggle = () => this.send("toggleEnabled");
    this.onCopy = () => this.send("copy", this.get("selectedItem"));
    this.onDestroy = () => this.send("destroy");
  },

  pageURL: document.location.origin + "/page/",

  basePCPage: computed("model.@each.id", function () {
    const page = EmberObject.create({});
    page.set("title", I18n.t("admin.procourse_static_pages.pages.new_title"));
    page.set("active", false);
    return page;
  }),

  removeSelected: function () {
    this.get("model").removeObject(this.get("selectedItem"));
    this.set("selectedItem", null);
  },

  clearLimitGroup: action(function () {
    this.get("selectedItem")?.set("group", null);
  }),

  editTitle: observer("selectedItem.title", function () {
    this.set("editingTitle", true);
    if (
      this.get("selectedItem") &&
      !this.get("selectedItem").custom_slug &&
      this.get("selectedItem").selected
    ) {
      this.get("selectedItem").set(
        "slug",
        this.slugify(this.get("selectedItem").title)
      );
    }
    this.set("editingTitle", false);
  }),

  editSlug: observer("selectedItem.slug", function () {
    if (
      this.get("selectedItem") &&
      !this.get("editingTitle") &&
      this.get("selectedItem").selected
    ) {
      if (this.get("originals").slug == this.get("selectedItem").slug) {
        this.get("selectedItem").set(
          "custom_slug",
          this.get("originals").custom_slug
        );
      } else {
        this.get("selectedItem").set("custom_slug", true);
      }
    }
  }),

  changed: observer(
    "selectedItem.title",
    "selectedItem.slug",
    "selectedItem.group",
    "selectedItem.raw",
    "selectedItem.html",
    "selectedItem.html_content",
    function () {
      if (!this.get("originals") || !this.get("selectedItem")) {
        this.set("disableSave", true);
        return;
      }
      if (
        (this.get("originals").title == this.get("selectedItem").title &&
          this.get("originals").slug == this.get("selectedItem").slug &&
          this.get("originals").group == this.get("selectedItem").group &&
          this.get("originals").raw == this.get("selectedItem").raw &&
          this.get("originals").html == this.get("selectedItem").html &&
          this.get("originals").html_content ==
            this.get("selectedItem").html_content &&
          this.get("originals").cooked == this.get("selectedItem").cooked) ||
        !this.get("selectedItem").title ||
        (!this.get("selectedItem").html && !this.get("selectedItem").raw) ||
        (this.get("selectedItem").html &&
          !this.get("selectedItem").html_content)
      ) {
        this.set("disableSave", true);
        return;
      } else {
        this.set("disableSave", false);
      }
    }
  ),

  slugify: function (text) {
    return text
      .toString()
      .toLowerCase()
      .replace(/\s+/g, "-") // Replace spaces with -
      .replace(/[^\w\-]+/g, "") // Remove all non-word chars
      .replace(/\-\-+/g, "-") // Replace multiple - with single -
      .replace(/^-+/, "") // Trim - from start of text
      .replace(/-+$/, ""); // Trim - from end of text
  },

  dialog: service(),

  actions: {
    selectPCPage: function (page) {
      Page.customGroups().then((g) => {
        this.set("customGroups", g);
        if (this.get("selectedItem")) {
          this.get("selectedItem").set("selected", false);
        }
        this.set("originals", {
          title: page.title,
          active: page.active,
          slug: page.slug,
          group: page.group,
          raw: page.raw,
          cooked: page.cooked,
          custom_slug: page.custom_slug,
          html: page.html,
          html_content: page.html_content,
        });
        this.set("disableSave", true);
        this.set("selectedItem", page);
        page.set("savingStatus", null);
        page.set("selected", true);
      });
    },

    newPCPage: function () {
      var basePCPage = this.get("basePCPage");
      const newPCPage = EmberObject.create(basePCPage);
      var newTitle = I18n.t("admin.procourse_static_pages.pages.new_title");
      newPCPage.set("title", newTitle);
      newPCPage.set("slug", this.slugify(newTitle));
      newPCPage.set("slugEdited", false);
      newPCPage.set("group", null), newPCPage.set("newRecord", true);
      newPCPage.set("html", false);
      newPCPage.set("html_content", "");
      this.get("model").pushObject(newPCPage);
      this.send("selectPCPage", newPCPage);
    },

    toggleEnabled: function () {
      var selectedItem = this.get("selectedItem");
      selectedItem.toggleProperty("active");
      Page.save(this.get("selectedItem"), true);
    },

    disableEnable: computed("id", "saving", function () {
      return !this.get("id") || this.get("saving");
    }),

    newRecord: computed("id", function () {
      return !this.get("id");
    }),

    save: function () {
      if (
        this.get("selectedItem").slug ==
        this.slugify(this.get("selectedItem").title)
      ) {
        this.get("selectedItem").set("custom_slug", false);
      }
      Page.save(this.get("selectedItem"));
      this.send("selectPCPage", this.get("selectedItem"));
    },

    copy: function (page) {
      var newPCPage = Page.copy(page);
      newPCPage.set(
        "title",
        I18n.t("admin.customize.colors.copy_name_prefix") +
          " " +
          page.get("title")
      );
      this.get("model").pushObject(newPCPage);
      this.send("selectPCPage", newPCPage);
      this.set("disableSave", false);
    },

    destroy: function () {
      const item = this.get("selectedItem");

      this.dialog.confirm({
        message: I18n.t("admin.procourse_static_pages.pages.delete_confirm"),
        cancelButtonLabel: "admin.procourse_static_pages.pages.confirm_no",
        confirmButtonLabel: "admin.procourse_static_pages.pages.confirm_yes",

        didConfirm: () => {
          if (!item.get("id")) {
            this.removeSelected();
          } else {
            Page.destroy(item).then(() => this.removeSelected());
          }
        },
      });
    },
  },
});
