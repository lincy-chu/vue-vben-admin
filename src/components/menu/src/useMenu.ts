// type
import { Ref, computed, unref, watch } from '@/setup/vue';
import { MenuData, MenuProps, MenuState, MenuTreeItem } from './type';
import { MenuTypeEnum, MenuModeEnum } from '@/enums/menuEnum';
import { Route } from 'vue-router/types/index';
// import { MenuTreeItem } from '@/router/menus/_type';
// import { BuildMenuModuleResult, MenuTreeItem } from '@/router/menus/_type';
// utils
import { es6Unique } from '@/utils/array/unique';
// import { flatTreeData } from '@/utils/treeUtil';
// store
import { menuStore } from '@/store/modules/menu';

import { useRouter } from '@/hooks/core/useRouter';
/**
 * @description: 菜单是否有子节点
 */
export function menuHasChildren(MenuTreeItem: MenuTreeItem): boolean {
  return (
    Reflect.has(MenuTreeItem, 'children') &&
    !!MenuTreeItem.children &&
    MenuTreeItem.children.length > 0
  );
}

/**
 * @description: 获取菜单的全部父级id
 */
export function getAllParentKey(menu: MenuTreeItem, allMenuList: MenuTreeItem[]): string[] {
  // const flatMenuList = flatTreeData(allMenuList, 'children');
  const menuParentIdList: string[] = [];

  const { parentId } = menu;

  if (!parentId) {
    return menuParentIdList;
  }
  const parent = allMenuList.find((m) => m.id === parentId);
  if (parent) {
    menuParentIdList.push(parent.id);

    menuParentIdList.push(...getAllParentKey(parent, allMenuList));
  }
  return menuParentIdList;
}
export function useOpenKeys(menuState: MenuState, getAllMenu: Ref<MenuData>) {
  const getOpenKeys = computed(() => {
    return menuStore.getCollapsedState ? menuState.collapsedOpenKeys : menuState.openKeys;
  });
  /**
   * @description:设置展开
   */
  function setOpenKeys(route: MenuTreeItem) {
    const { flatMenus } = unref(getAllMenu);
    const openKeys = getAllParentKey(route, flatMenus);
    menuState.openKeys = openKeys;
  }
  /**
   * @description:  重置值
   */
  function resetKeys() {
    menuState.selectedKeys = [];
    menuState.openKeys = [];
  }

  function handleOpenChange(openKeys: string[]) {
    if (!menuStore.getCollapsedState) {
      menuState.openKeys = openKeys;
    } else {
      menuState.collapsedOpenKeys = openKeys;
    }
  }
  return { setOpenKeys, resetKeys, handleOpenChange, getOpenKeys };
}

/**
 * @description: 搜索相关方法
 */
export function useSearchInput({
  menuState,
  getAllMenu,
  props,
}: {
  menuState: MenuState;
  getAllMenu: Ref<MenuData>;
  props: MenuProps;
}) {
  const getIsShowSearch = computed(() => {
    return (
      props.search && !(props.type === MenuTypeEnum.MIX && props.mode === MenuModeEnum.HORIZONTAL)
    );
  });
  /**
   * @description: 输入框搜索
   */
  function handleInputChange(value?: string): void {
    menuState.searchValue = value || '';
    if (!value) {
      menuState.openKeys = [];
      return;
    }

    const { flatMenus } = unref(getAllMenu);
    let openKeys: string[] = [];
    for (const menu of flatMenus) {
      const { name } = menu;
      if (!name.includes(value)) {
        continue;
      }
      openKeys = openKeys.concat(getAllParentKey(menu, flatMenus));
    }
    openKeys = es6Unique(openKeys);
    menuState.openKeys = openKeys;
  }
  // 搜索框点击
  function handleInputClick(): void {
    if (menuStore.getCollapsedState) {
      menuStore.commitCollapsedState(false);
    }
  }
  return { handleInputChange, handleInputClick, getIsShowSearch };
}

/**
 * @description: 菜单模式为：sidebar
 */
export function useSideBar({
  menuState,
  getAllMenu,
  setOpenKeys,
  resetKeys,
}: {
  menuState: MenuState;
  getAllMenu: Ref<MenuData>;
  setOpenKeys: (route: MenuTreeItem) => void;
  resetKeys: () => void;
}) {
  const { route } = useRouter();

  /**
   * @description: 监听路由变化，则menu选中变化
   */
  watch(
    [() => unref(route), () => unref(getAllMenu)],
    ([route]) => {
      if (!unref(getAllMenu)) {
        return;
      }
      const { flatMenus } = unref(getAllMenu);
      if (!flatMenus) {
        return;
      }
      const findMenu = flatMenus.find((menu) => menu.path === (route as Route).path);

      if (findMenu) {
        if (menuState.mode !== MenuModeEnum.HORIZONTAL) {
          setOpenKeys(findMenu);
        }

        menuState.selectedKeys = [findMenu.id];
      } else {
        resetKeys();
      }
    },
    {
      immediate: true,
    }
  );
}