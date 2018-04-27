const showError = (err, description = "Could not process action: ") => {
  let message = 'Unknown cause';

  if (err && err.message) {
    message = err.message;
  } else if (err && err.data && err.data.message) {
    message = err.data.message;
  } else if (typeof err == "string") {
    message = err;
  }

  $.gritter.add({
    title: 'Error',
    text: `${description} ${message}`,
    sticky: false,
    time: 8000,
    class_name: 'my-sticky-class',
  });
};

// Copied from the angular tutorial on how to add transformations
const appendHttpResponseTransform = (defaults, transform) => {
  // We can't guarantee that the default transformation is an array
  defaults = angular.isArray(defaults) ? defaults : [defaults];

  // Append the new transformation to the defaults
  return defaults.concat(transform);
}

const showSuccess = (message) => {
  $.gritter.add({
    title: 'Success',
    text: message,
    sticky: false,
    time: 8000,
    class_name: 'my-sticky-class',
  });
}

const convertToCsv = (data) => {
  const escape = (str) => {
    if(!str)
      return "";
    var result = str.toString().replace(/"/g, '""');
    if (result.search(/("|,|\n)/g) >= 0)
      result = '"' + result + '"';
    return result;
  }

  var labels = [];
  data.forEach((obj) => {
    for(var key in obj) {
      if(obj.hasOwnProperty(key) && !labels.find((label) => {return label == key;})) {
        labels.push(key);
      }
    }
  });

  var csvContent = "";

  csvContent += labels.map(escape).join(',') + "\n";

  csvContent += data.map((obj) => {
    var tmp = [];
    labels.forEach((label) => {
      tmp.push(escape(obj[label]));
    });
    return tmp.join(',');
  }).join('\n');
  return csvContent;
}

const infiniteScroll = ($http, vm, url, paramInjector, pageSize = 15) => {
  vm.infiniteScroll = {
    pageSize: pageSize,
    raceCounter: 0
  }

  vm.resetData = () => {
    vm.infiniteScroll.block = false;
    vm.infiniteScroll.busy = false;
    if(!vm.infiniteScroll.data)
      vm.infiniteScroll.data = [];
    vm.infiniteScroll.resetOnNextFetch = true;
    vm.infiniteScroll.page = 0;
    promise = vm.loadNextPage();
    vm.infiniteScroll.loadingMoreResults = false
    return promise;
  }

  // Merges two arrays, not relying on any sorting but also maybe shuffling a preexisting order
  const mergeUnsorted = (local_data, new_data, compare) => {
    // Loop through the existing data and try to find partner elements in the new data
    for(let i=0; i<local_data.length; i++) {
      let idx = new_data.findIndex(compare.bind(null, local_data[i]));
      // In case we found no partner element, remove that one
      if(idx == -1) {
        local_data.splice(i, 1);
        i--;
      } 
      // In case we did find a partner elements, remove that from the input data to not add it again at the end
      else {
        new_data.splice(idx, 1);
      }
    }
    // Add remaining items which we haven't added yet
    Array.prototype.push.apply(local_data, new_data);
  }

  // Merges two arrays relying on them being sorted and maintaining sortedness
  const mergeSorted = (local_data, new_data, compare) => {
    let i=0;
    let j=0;
    while(i<local_data.length) {
      // Two possible scenarios:
      // 1) local_data[i] has a match in new_data at idx and idx is equal or greater to j, 
      //    - add everything in new_data between j and idx to local_data and preserve local_data[i]
      //    - advance j to idx plus one
      //    - advance i by amount of added data plus one
      // 2) local_data[i] has no match in new_data
      //    - remove local_data[i]
      // 3) local_data[i] has matched to new_data at idx and idx is smaller than j
      //    -> local_data wasn't sorted and this element was inserted earlier one
      //    - remove local_data[i]
      let idx = new_data.findIndex(compare.bind(null, local_data[i]));
      // 2) and 3)
      if(idx < j)
        local_data.splice(i, 1);
      // 1)
      else {
        let count_additions = 0;
        while(j < idx) {
          local_data.splice(i, 0, new_data[j]);
          j++;
          count_additions++;
        }
        j++;
        i = i + count_additions + 1;
      }
    }
    // Add remaining elements in new_data to local_data
    while(j < new_data.length) {
      local_data.push(new_data[j]);
      j++;
    }
  }

  vm.loadNextPage = () => {
    vm.infiniteScroll.block = true;
    vm.infiniteScroll.busy = true;
    vm.infiniteScroll.loadingMoreResults = true;
    vm.infiniteScroll.raceCounter++;
    var localRaceCounter = vm.infiniteScroll.raceCounter;
    var params = {
      offset: vm.infiniteScroll.page * vm.infiniteScroll.pageSize,
      limit: vm.infiniteScroll.pageSize
    };
    if(paramInjector)
      params = paramInjector(params);

    // Use sendParams in case you want to strip empty params
    /*
    var sendParams = {};
    for(var key in params) {
      if(params.hasOwnProperty(key) && params[key])
        sendParams[key] = params[key];
    }
    */

    return $http({
      url: url,
      method: 'GET',
      params: params
    }).then((response) => {
      if(localRaceCounter == vm.infiniteScroll.raceCounter) {
        vm.infiniteScroll.busy = false;
        vm.infiniteScroll.loadingMoreResults = false;
        // If we have data, add that to the list
        if(response.data.data.length > 0) {
          vm.infiniteScroll.page++;

          // To preserve nice angular animations try to do a "soft" reset where we only remove those elements that are not in the response
          if(vm.infiniteScroll.resetOnNextFetch == true) {
            vm.infiniteScroll.resetOnNextFetch = false;
            var new_data = response.data.data.slice();
            // This relies on elements having an id, 
            // The problem with normal equal comparison is that angular modifies the elements
            const isPartnerElement = function(elem1, elem2) {return elem1.id == elem2.id;}
            mergeSorted(vm.infiniteScroll.data, new_data, isPartnerElement)
          }
          // If it was a load of an additional page just add data
          else 
            Array.prototype.push.apply(vm.infiniteScroll.data, response.data.data);
          
          // If we got less than requested results, do not ask for more
          if(response.data.data.length >= vm.infiniteScroll.pageSize)
            vm.infiniteScroll.block = false;
        } 
        // In case we got no results, don't forget to reset
        else if(vm.infiniteScroll.resetOnNextFetch == true) {
          vm.infiniteScroll.resetOnNextFetch = false;
          vm.infiniteScroll.data = [];
        }
      }
    }).catch((error) => {
      showError(error);
    });
  }

  vm.resetData();
}