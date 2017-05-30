'use strict';

angular.module('ddosAgTree', ['agGrid'])

.factory('agTree', [function() {

  function selectUnselectChidlrenParent(api, node, selected) {
    // recursive logic
    function deselectParent(_node) {
      api.deselectNode(_node);
      _node.selected = false;
      if (_node.parent)
        deselectParent(_node.parent);
    }
    function deselectChildren(_node) {
      _node.selected = false
      for (var i = 0; i < _node.children.length; ++i) {
        api.deselectNode( _node.children[i] );
        _node.selected = false
        if ( _node.children[i].group )
          deselectChildren(_node.children[i] );
      }
    }
    function selectChildren(_node) {
      _node.selected = true
      for (var i = 0; i < _node.children.length; ++i){
        api.selectNode( _node.children[i], true );
        _node.selected = true
        if ( _node.children[i].group )
          selectChildren( _node.children[i] );
      }
    }

    var i;
    if (selected) {
      if (node.group) { // select all childs
        selectChildren( node );
      }
      if (node.parent) { // check for selected all childs and select group
        var parent = node.parent;
        var allChildrenSelected = parent.children.length > 0;
        for (i = 0; i < parent.children.length; ++i) {
          if ( !api.isNodeSelected( parent.children[i] ) ) {
            allChildrenSelected = false;
            break;
          }
        }

        if (allChildrenSelected)
          api.selectNode(parent, true);
      }
    } else {
      if (node.group) // deselect recursive all childs
        deselectChildren(node);
      if (node.parent) // deselect recursive all parents
        deselectParent(node.parent);
    }
  }

  // TODO
  function onExpandOrCollapse(params, colDef) {
    var node = params.node;
    var api = params.api;
    params.event.stopPropagation(); // do not select row

    if ( !node.expanded &&
         angular.isDefined( node.lazyLoaded ) && (!node.lazyLoaded || node.lazyRefresh) ) {
      if ( angular.isUndefined( colDef.lazyLoading.callback ) )
          throw 'Found element for lazy loading, but not defined callback for do it';

      colDef.lazyLoading.callback(node.data).then(
        function(children) {
          if ( node.lazyLoaded && node.lazyRefresh ) {
            node.children.length = 0;
            node.childrenAfterSort.length = 0;
            node.childrenAfterFilter.length = 0;
          }

          node.lazyLoaded = true;
          var isSorted = api.getSortModel().length > 0;
          var isFiltered = api.getFilterModel().length > 0;
          for (var i = 0; i < children.length; ++i) {
            var child = {
                group: false,
                id: colDef.lazyLoading.index++,
                data: children[i],
                parent: node,
                level: 1
            };
            node.children.push( child );
            // FIXME
            if (isSorted)
              node.childrenAfterSort.push( child );
            if (isFiltered)
              node.childrenAfterFilter.push( child );
          }

          node.allChildrenCount = node.children.length;
          update();
          selectUnselectChidlrenParent(api, node, api.isNodeSelected(node));
        },
        function(response) {}
      );
    } else
      update();

    function update() {
      node.expanded = !node.expanded;
      api.onGroupExpandedOrCollapsed( params.rowIndex );
      // switchIcons( node.expanded );
    }
  }

  function groupCellRenderer(params) {
    var api = params.api;
    var node = params.node;
    var colDef = params.colDef;
    var eCell = $('<span>');

    // set childs offset
    eCell.css("padding-left", node.level ? (node.level * 14 + 'px') : '0');

    // add expand functionality
    addExpandAndCollapse();

    // add select functionality
    if(colDef.useCheckboxSelection)
      addSelectionCheckbox();

    var eNameIcon = $( node.group ? colDef.icons.branch : colDef.icons.leaf );
    var eName = $('<span>');
    eName.text( params.data[colDef.field] );
    eCell.append( eNameIcon, eName );
    return eCell.get(0);

    function addExpandAndCollapse() {
      if (!node.group)
        return;

      var eExpandIcon = $('<i class="fa fa-fw fa-plus-square-o ag-expand-icon">');
      var eCollapseIcon = $('<i class="fa fa-fw fa-minus-square-o ag-expand-icon">');

      eExpandIcon.click( onExpandOrCollapse );
      eCollapseIcon.click( onExpandOrCollapse );
      switchIcons( node.expanded );
      eCell.append(eExpandIcon, eCollapseIcon);

      function switchIcons(expanded) {
        if (expanded) {
          eExpandIcon.hide();
          eCollapseIcon.show();
        } else {
          eExpandIcon.show();
          eCollapseIcon.hide();
        }
      }

      function onExpandOrCollapse(event) {
        event.stopPropagation(); // do not select row

        if ( !node.expanded &&
             angular.isDefined( node.lazyLoaded ) && (!node.lazyLoaded || node.lazyRefresh) ) {
          if ( angular.isUndefined( colDef.lazyLoading.callback ) )
              throw 'Found element for lazy loading, but not defined callback for do it';

          colDef.lazyLoading.callback(node.data).then(
            function(children) {
              if ( node.lazyLoaded && node.lazyRefresh ) {
                node.children.length = 0;
                node.childrenAfterSort.length = 0;
                node.childrenAfterFilter.length = 0;
              }

              node.lazyLoaded = true;
              var isSorted = api.getSortModel().length > 0;
              var isFiltered = api.getFilterModel().length > 0;
              for (var i = 0; i < children.length; ++i) {
                var child = {
                    group: false,
                    id: colDef.lazyLoading.index++,
                    data: children[i],
                    parent: node,
                    level: 1
                };
                node.children.push( child );
                // FIXME
                if (isSorted)
                  node.childrenAfterSort.push( child );
                if (isFiltered)
                  node.childrenAfterFilter.push( child );
              }
              api.filterManager.onNewRowsLoaded();

              node.allChildrenCount = node.children.length;
              update();
              selectUnselectChidlrenParent(api, node, api.isNodeSelected(node));
            },
            function(response) {}
          );
        } else
          update();

        function update() {
          node.expanded = !node.expanded;
          api.onGroupExpandedOrCollapsed( params.rowIndex );
          switchIcons( node.expanded );
        }
      }
    }

    function addSelectionCheckbox() {
      var eCheckbox = $('<input/>', { type: 'checkbox', class: 'ag-selection-checkbox' });
      setCheckboxState( api.isNodeSelected(node) );

      // needed for not fired rowSelected
      eCheckbox.click(function(event) {
        event.stopPropagation();
      });

      eCheckbox.change(function() {
        var selected = eCheckbox.is(':checked');
        if ( selected )
        {
          api.selectNode(node, true );
          node.selected = true;
        }
        else
        {
          api.deselectNode(node);
          node.selected = false;
        }

        selectUnselectChidlrenParent(api, node, selected);
      });

      eCell.append( eCheckbox );

      api.addVirtualRowListener(params.rowIndex, {
          rowSelected: function (selected) {
            setCheckboxState(selected);
            if (selected)
              selectUnselectChidlrenParent(api, node, selected);
          },
          // rowRemoved: function () {
          // }
      });



      function setCheckboxState(state) {
        if (typeof state === 'boolean') {
            eCheckbox.prop('checked', state);
            // eCheckbox.prop('indeterminate', false);
        } else {
            // isNodeSelected returns back undefined if it's a group and the children
            // are a mix of selected and unselected
            // eCheckbox.prop('indeterminate', true);
        }
      }
    }
  }

  var gridTreeOptions = {
    columnDefs: [
      {
        headerName: "",
        headerTooltip: "",
        headerClass: "text-left",
        field: "name",
        width: 245,
        cellRenderer: groupCellRenderer,
        lazyLoading: {
          callback: undefined,

          // IMPORTANT !!!
          // this index will be used for lazy loaded children.
          // values lower that is for ag-grid internally!
          index: 268435455
        },
        icons: {
          branch: '',
          leaf: ''
        }
      }
    ],

    rowData: null,
    rowSelection: 'multiple',
    rowDeselection: true,
    rowsAlreadyGrouped: true,
    enableColResize: true,
    enableSorting: true,
    enableFilter: true,
    groupSelectsChildren: false,
    rowHeight: 20,
    overlayLoadingTemplate: /*'Загрузка...'*/'Loading...',
    overlayNoRowsTemplate: /*'Нет данных для отображения'*/'No data to show',
    onRowClickedUser: undefined,
    multiselect: undefined,
    onRowClicked: function (params) {
      if(this.multiselect){
        this.onRowClickedUser(params);
        return;
      }

      if ( params.node.group )
        params.api.selectNode( params.node, params.event.ctrlKey );

      if ( !params.event.ctrlKey && this.onRowClickedUser )
        this.onRowClickedUser( params.data, params.node.group);
    },
    onRowDoubleClicked: function(params) {
      onExpandOrCollapse(params, this.columnDefs[0]); // TODO
    },

    icons: {
      sortAscending: '<i class="fa fa-sort-asc">',
      sortDescending: '<i class="fa fa-sort-desc">',
    },
  };

  var f = {
    /*
      config as:
      {
        headerName: "",
        headerTooltip: "",
        field: "",
        width: 100,
        icons: {
          branch: '',
          leaf: ''
        },
        onRowClickedUser: undefined,
        onLazyLoading: undefined,
        columnDefsAdditional: []
      }
    */
    create: function(config) {
      var copy = angular.copy( gridTreeOptions );

      copy.columnDefs[0].headerName = config&&config.headerName || '';
      copy.columnDefs[0].headerTooltip = config&&config.headerTooltip || '';
      copy.columnDefs[0].field = config&&config.field || '';
      copy.columnDefs[0].width = config&&config.width || 100;
      copy.multiselect = config&&config.multiselect || false;

      copy.columnDefs[0].icons.branch = config&&config.icons&&config.icons.branch || '';
      copy.columnDefs[0].icons.leaf = config&&config.icons&&config.icons.leaf || '';

      copy.columnDefs[0].lazyLoading.callback = config&&config.onLazyLoading || undefined;

      copy.onRowClickedUser = config&&config.onRowClickedUser || undefined;

      copy.columnDefs[0].useCheckboxSelection = config&&config.useCheckboxSelection || false;
      copy.columnDefs[0].hide = config&&config.hide || false;
      copy.columnDefs[0].comparator = config&&config.comparator || false;

      if (config && config.columnDefsAdditional) {
        for (var i = 0; i < config.columnDefsAdditional.length; ++i)
          copy.columnDefs.push(config.columnDefsAdditional[i]);
      }

      return copy;
    }
  };

  return f;
}])

;
