import { inject, cloneVNode, defineComponent, PropType } from 'vue';
import PropTypes from '../_util/vue-types';
import { filterEmpty, getComponent, getSlot } from '../_util/props-util';
import warning from '../_util/warning';
import { defaultConfigProvider } from '../config-provider';
import BreadcrumbItem from './BreadcrumbItem';
import Menu from '../menu';
import { Omit, VueNode } from '../_util/type';

export interface Route {
  path: string;
  breadcrumbName: string;
  children?: Omit<Route, 'children'>[];
}

const BreadcrumbProps = {
  prefixCls: PropTypes.string,
  routes: { type: Array as PropType<Route[]> },
  params: PropTypes.any,
  separator: PropTypes.VNodeChild,
  itemRender: {
    type: Function as PropType<
      (route: Route, params: any, routes: Array<Route>, paths: Array<string>) => VueNode
    >,
  },
};

function getBreadcrumbName(route: Route, params: any) {
  if (!route.breadcrumbName) {
    return null;
  }
  const paramsKeys = Object.keys(params).join('|');
  const name = route.breadcrumbName.replace(
    new RegExp(`:(${paramsKeys})`, 'g'),
    (replacement, key) => params[key] || replacement,
  );
  return name;
}
function defaultItemRender(opt: {
  route: Route;
  params: any;
  routes: Route[];
  paths: string[];
}): VueNode {
  const { route, params, routes, paths } = opt;
  const isLastItem = routes.indexOf(route) === routes.length - 1;
  const name = getBreadcrumbName(route, params);
  return isLastItem ? <span>{name}</span> : <a href={`#/${paths.join('/')}`}>{name}</a>;
}

export default defineComponent({
  name: 'ABreadcrumb',
  props: BreadcrumbProps,
  setup() {
    return {
      configProvider: inject('configProvider', defaultConfigProvider),
    };
  },
  methods: {
    getPath(path: string, params: any) {
      path = (path || '').replace(/^\//, '');
      Object.keys(params).forEach(key => {
        path = path.replace(`:${key}`, params[key]);
      });
      return path;
    },

    addChildPath(paths: string[], childPath = '', params: any) {
      const originalPaths = [...paths];
      const path = this.getPath(childPath, params);
      if (path) {
        originalPaths.push(path);
      }
      return originalPaths;
    },

    genForRoutes({ routes = [], params = {}, separator, itemRender = defaultItemRender }: any) {
      const paths = [];
      return routes.map((route: Route) => {
        const path = this.getPath(route.path, params);

        if (path) {
          paths.push(path);
        }
        const tempPaths = [...paths];
        // generated overlay by route.children
        let overlay = null;
        if (route.children && route.children.length) {
          overlay = (
            <Menu>
              {route.children.map(child => (
                <Menu.Item key={child.path || child.breadcrumbName}>
                  {itemRender({
                    route: child,
                    params,
                    routes,
                    paths: this.addChildPath(tempPaths, child.path, params),
                  })}
                </Menu.Item>
              ))}
            </Menu>
          );
        }

        return (
          <BreadcrumbItem
            overlay={overlay}
            separator={separator}
            key={path || route.breadcrumbName}
          >
            {itemRender({ route, params, routes, paths: tempPaths })}
          </BreadcrumbItem>
        );
      });
    },
  },
  render() {
    let crumbs: VueNode[];
    const { prefixCls: customizePrefixCls, routes, params = {}, $slots } = this;
    const getPrefixCls = this.configProvider.getPrefixCls;
    const prefixCls = getPrefixCls('breadcrumb', customizePrefixCls);

    const children = filterEmpty(getSlot(this));
    const separator = getComponent(this, 'separator');
    const itemRender = this.itemRender || $slots.itemRender || defaultItemRender;
    if (routes && routes.length > 0) {
      // generated by route
      crumbs = this.genForRoutes({
        routes,
        params,
        separator,
        itemRender,
      });
    } else if (children.length) {
      crumbs = children.map((element, index) => {
        warning(
          typeof element.type === 'object' &&
            (element.type.__ANT_BREADCRUMB_ITEM || element.type.__ANT_BREADCRUMB_SEPARATOR),
          'Breadcrumb',
          "Only accepts Breadcrumb.Item and Breadcrumb.Separator as it's children",
        );
        return cloneVNode(element, { separator, key: index });
      });
    }
    return <div class={prefixCls}>{crumbs}</div>;
  },
});
