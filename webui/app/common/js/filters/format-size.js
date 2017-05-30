'use strict'

/**
* filters.formatSize Module
*
* Description
*/
angular.module('filters.formatSize', [])

.filter('formatSize', function() {
  var suffixes = [ "", "k", "M", "G", "T", "P", "E", "Z", "Y" ];
  var edge = 1024;
  return function(input) {
    input = input || 0;
    var limit = edge;
    var suffix = 0;
    for (; suffix < suffixes.length; limit*=edge, ++suffix) {
        if (input < limit)
            return (input/(limit/edge)).toFixed() + suffixes[suffix];
    }

    return input;
  };
})

;