<template>
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <v-row class="align-center" dense>
      <v-col cols="12">
        <div class="d-flex align-center">
          <template v-for="(crumb, idx) in crumbs" :key="idx">
            <v-btn
              v-if="!isLast(idx) && crumb.to"
              text
              density="compact"
              class="breadcrumb-link"
              @click="navigate(crumb)">
              {{ crumb.text }}
            </v-btn>
            <span v-else class="breadcrumb-current">{{ crumb.text }}</span>

            <v-icon  v-if="idx < crumbs.length - 1" size="12" class="mx-2" icon="fa-chevron-right"></v-icon>
          </template>
        </div>
      </v-col>
    </v-row>
  </nav>
</template>

<script>
import { useRouter, useRoute } from 'vue-router';
import { computed } from 'vue';

export default {
  name: 'BreadCrumbs',
  props: {
    // optional explicit items: [{ text, to }]
    items: {
      type: Array,
      required: false,
      default: null,
    },
  },
  setup(props) {
    const router = useRouter();
    const route = useRoute();

    const buildFromRoute = () => {
      // If this is the view or edit route for books, build a consistent
      // breadcrumb: Home > Manage Books > View/Edit <id>
      if ((route.name === 'view-book' || route.name === 'edit-book')) {
        const paramKeys = Object.keys(route.params || {});
        const id = route.params[paramKeys[0]] || '';
        const action = route.name === 'view-book' ? 'View' : 'Edit';
        return [
          { text: 'Home', to: '/' },
          { text: 'Manage Books', to: '/manage-books' },
          { text: `${action} ${id}`, to: null },
        ];
      }

      // default home crumb
      const crumbs = [{ text: 'Home', to: '/' }];
      const parts = route.path.split('/').filter(Boolean);
      let acc = '';
      parts.forEach((p, i) => {
        acc += `/${p}`;
        const text = decodeURIComponent(p).replace(/[-_]/g, ' ');
        crumbs.push({ text: text.charAt(0).toUpperCase() + text.slice(1), to: acc });
      });

      // If the route includes a param (generic case), prefer combining the action and id
      const paramKeys = Object.keys(route.params || {});
      if (paramKeys.length > 0 && parts.length >= 2) {
        // Use the first param value (common case: bookCode)
        const id = route.params[paramKeys[0]];
        // action segment is the second-to-last part (e.g. 'view' or 'edit')
        const actionSegment = parts[parts.length - 2];

        // Remove the last two crumbs (action + id) and replace with combined
        crumbs.splice(crumbs.length - 2, 2);
        const actionText = decodeURIComponent(actionSegment).replace(/[-_]/g, ' ');
        const label = `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} ${id}`;
        // final crumb is not navigable (current page)
        crumbs.push({ text: label, to: null });
      }

      return crumbs;
    };

    // Make crumbs reactive to route changes by using a computed ref.
    const crumbs = computed(() => {
      return props.items || buildFromRoute();
    });

    const isLast = (idx) => idx === crumbs.value.length - 1;

    const navigate = (crumb) => {
      if (!crumb || !crumb.to) return;
      if (typeof crumb.to === 'string') router.push(crumb.to);
      else router.push(crumb.to);
    };

    return { crumbs, isLast, navigate };
  },
};
</script>

<style scoped>
.breadcrumbs { font-size: 0.9rem; color: var(--v-theme-on-surface); }
.breadcrumb-link { padding: 0; min-width: 0; }
.breadcrumb-current { font-weight: 400; color: grey; }
.breadcrumb-link, .v-icon { color: grey; }
</style>
