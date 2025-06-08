import { mergeLists } from '../lib/utils/mergeLists';

describe('Range Merging Tests', () => {
  test('should merge two ranges correctly: 10-15 + 10-15 = 20-30', () => {
    const listA = [{
      name: 'sun-dried tomatoes',
      quantity: 12.5, // midpoint of 10-15
      unit: '',
      displayQuantity: '10-15'
    }];
    
    const listB = [{
      name: 'sun-dried tomatoes',
      quantity: 12.5, // midpoint of 10-15
      unit: '',
      displayQuantity: '10-15'
    }];
    
    const result = mergeLists(listA, listB);
    
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: 'sun-dried tomatoes',
      quantity: 25, // midpoint of 20-30
      unit: '',
      displayQuantity: '20-30'
    });
  });

  test('should merge range with number: 10-15 + 5 = 15-20', () => {
    const listA = [{
      name: 'tomatoes',
      quantity: 12.5, // midpoint of 10-15
      unit: '',
      displayQuantity: '10-15'
    }];
    
    const listB = [{
      name: 'tomatoes',
      quantity: 5,
      unit: '',
      displayQuantity: '5'
    }];
    
    const result = mergeLists(listA, listB);
    
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: 'tomatoes',
      quantity: 17.5, // midpoint of 15-20
      unit: '',
      displayQuantity: '15-20'
    });
  });

  test('should merge number with range: 5 + 10-15 = 15-20', () => {
    const listA = [{
      name: 'garlic cloves',
      quantity: 5,
      unit: '',
      displayQuantity: '5'
    }];
    
    const listB = [{
      name: 'garlic cloves',
      quantity: 12.5, // midpoint of 10-15
      unit: '',
      displayQuantity: '10-15'
    }];
    
    const result = mergeLists(listA, listB);
    
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: 'garlic cloves',
      quantity: 17.5, // midpoint of 15-20
      unit: '',
      displayQuantity: '15-20'
    });
  });

  test('should merge regular numbers normally', () => {
    const listA = [{
      name: 'eggs',
      quantity: 2,
      unit: '',
      displayQuantity: '2'
    }];
    
    const listB = [{
      name: 'eggs',
      quantity: 6,
      unit: '',
      displayQuantity: '6'
    }];
    
    const result = mergeLists(listA, listB);
    
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: 'eggs',
      quantity: 8,
      unit: '',
      displayQuantity: '8'
    });
  });

  test('should handle complex range merging: 4-6 + 2-3 = 6-9', () => {
    const listA = [{
      name: 'cloves garlic',
      quantity: 5, // midpoint of 4-6
      unit: '',
      displayQuantity: '4-6'
    }];
    
    const listB = [{
      name: 'cloves garlic',
      quantity: 2.5, // midpoint of 2-3
      unit: '',
      displayQuantity: '2-3'
    }];
    
    const result = mergeLists(listA, listB);
    
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: 'cloves garlic',
      quantity: 7.5, // midpoint of 6-9
      unit: '',
      displayQuantity: '6-9'
    });
  });
}); 