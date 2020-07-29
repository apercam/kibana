/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { CoreSetup, PluginInitializerContext } from 'src/core/public';

import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/public';
import { ManagementSetup } from '../../../../src/plugins/management/public';
import {
  FeatureCatalogueCategory,
  FeatureCatalogueHomePageSection,
  HomePublicPluginSetup,
} from '../../../../src/plugins/home/public';
import { PLUGIN } from '../common/constants';

import { ClientConfigType } from './types';

import { httpService, setUiMetricService } from './application/services/http';
import { textService } from './application/services/text';
import { UiMetricService } from './application/services';
import { UIM_APP_NAME } from './application/constants';

interface PluginsDependencies {
  usageCollection: UsageCollectionSetup;
  management: ManagementSetup;
  home?: HomePublicPluginSetup;
}

export class SnapshotRestoreUIPlugin {
  private uiMetricService = new UiMetricService(UIM_APP_NAME);

  constructor(private readonly initializerContext: PluginInitializerContext) {
    // Temporary hack to provide the service instances in module files in order to avoid a big refactor
    setUiMetricService(this.uiMetricService);
  }

  public setup(coreSetup: CoreSetup, plugins: PluginsDependencies): void {
    const config = this.initializerContext.config.get<ClientConfigType>();
    const { http } = coreSetup;
    const { home, management, usageCollection } = plugins;

    // Initialize services
    this.uiMetricService.setup(usageCollection);
    textService.setup(i18n);
    httpService.setup(http);

    management.sections.section.data.registerApp({
      id: PLUGIN.id,
      title: i18n.translate('xpack.snapshotRestore.appTitle', {
        defaultMessage: 'Snapshot and Restore',
      }),
      order: 3,
      mount: async (params) => {
        const { mountManagementSection } = await import('./application/mount_management_section');
        const services = {
          uiMetricService: this.uiMetricService,
        };
        return await mountManagementSection(coreSetup, services, config, params);
      },
    });

    if (home) {
      home.featureCatalogue.register({
        id: PLUGIN.id,
        title: i18n.translate('xpack.snapshotRestore.featureCatalogueTitle', {
          defaultMessage: 'Store & recover backups',
        }),
        description: i18n.translate('xpack.snapshotRestore.featureCatalogueDescription', {
          defaultMessage:
            'Use repositories to snapshot and restore Elasticsearch indices and clusters.',
        }),
        icon: 'storage',
        path: '/app/management/data/snapshot_restore',
        homePageSection: FeatureCatalogueHomePageSection.MANAGE_DATA,
        category: FeatureCatalogueCategory.ADMIN,
        order: 300,
      });
    }
  }

  public start() {}
  public stop() {}
}
